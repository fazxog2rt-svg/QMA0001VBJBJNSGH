import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  generateDependencyReport,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import play from "play-dl";
import type { Guild, GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import { logger } from "../logger.service";
import type { LoopMode, Track } from "./types";

/**
 * Antrean musik per-guild: memegang koneksi suara, audio player, daftar lagu,
 * mode loop, dan volume. Streaming memakai play-dl (Opus langsung dari YouTube),
 * jadi tidak butuh ffmpeg. Player otomatis lanjut ke lagu berikutnya saat idle.
 */
export class GuildMusicQueue {
  tracks: Track[] = [];
  current: Track | null = null;
  loop: LoopMode = "off";
  volume = 100;
  readonly player: AudioPlayer;

  private destroyed = false;
  private skipping = false;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly guildId: string,
    public voiceChannelId: string,
    public readonly connection: VoiceConnection,
    public textChannel: GuildTextBasedChannel,
    private readonly onEmpty: (guildId: string) => void,
  ) {
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.handleTrackEnd();
    });
    this.player.on("error", (error) => {
      logger.error("Audio player error", { guildId: this.guildId, error: error.message });
      void this.handleTrackEnd();
    });
  }

  enqueue(track: Track): void {
    this.tracks.push(track);
  }

  /** Mulai memutar jika belum ada lagu yang sedang diputar. */
  async start(): Promise<void> {
    if (this.current) return;
    await this.playNext();
  }

  private async handleTrackEnd(): Promise<void> {
    if (this.destroyed) return;

    const finished = this.current;
    if (!this.skipping && finished) {
      if (this.loop === "track") this.tracks.unshift(finished);
      else if (this.loop === "queue") this.tracks.push(finished);
    }
    this.skipping = false;
    await this.playNext();
  }

  private async playNext(): Promise<void> {
    if (this.destroyed) return;

    const next = this.tracks.shift();
    if (!next) {
      this.current = null;
      this.scheduleIdleLeave();
      return;
    }

    this.current = next;
    try {
      const source = await play.stream(next.url);
      const resource = createAudioResource(source.stream, {
        inputType: source.type,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume / 100);
      this.player.play(resource);
    } catch (error) {
      logger.error("Gagal memutar track, dilewati", {
        url: next.url,
        error: error instanceof Error ? error.message : error,
      });
      await this.playNext();
    }
  }

  /** Putuskan koneksi otomatis jika antrean kosong selama 5 menit. */
  private scheduleIdleLeave(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.onEmpty(this.guildId), 5 * 60 * 1000);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  skip(): void {
    this.skipping = true;
    this.player.stop(true);
  }

  pause(): boolean {
    return this.player.pause();
  }

  resume(): boolean {
    return this.player.unpause();
  }

  setLoop(mode: LoopMode): void {
    this.loop = mode;
  }

  setVolume(percent: number): void {
    this.volume = percent;
    // Placeholder resource menyimpan transformer volume dari play(); ambil via state.
    const state = this.player.state;
    if (state.status !== AudioPlayerStatus.Idle && "resource" in state) {
      state.resource.volume?.setVolume(percent / 100);
    }
  }

  shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.tracks[i]!;
      this.tracks[i] = this.tracks[j]!;
      this.tracks[j] = temp;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearIdleTimer();
    this.tracks = [];
    this.current = null;
    this.player.stop(true);
    try {
      this.connection.destroy();
    } catch {
      // koneksi mungkin sudah tertutup
    }
  }
}

const queues = new Map<string, GuildMusicQueue>();

export function getQueue(guildId: string): GuildMusicQueue | undefined {
  return queues.get(guildId);
}

export function destroyQueue(guildId: string): void {
  queues.get(guildId)?.destroy();
  queues.delete(guildId);
}

/**
 * Bergabung ke voice channel dan membuat antrean baru untuk guild.
 * Menunggu koneksi siap (maks 20 detik) sebelum mengembalikan queue.
 */
export async function createQueue(
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  textChannel: GuildTextBasedChannel,
): Promise<GuildMusicQueue> {
  const existing = queues.get(guild.id);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch (error) {
    // Log detail + laporan dependency (opus & enkripsi) untuk membedakan masalah
    // library (bisa diperbaiki dari kode) vs. UDP diblokir hosting (tidak bisa).
    logger.error("Gagal menyiapkan koneksi suara (Ready timeout)", {
      guildId: guild.id,
      error: error instanceof Error ? error.message : error,
    });
    logger.error(`Voice dependency report:\n${generateDependencyReport()}`);
    connection.destroy();
    throw error instanceof Error ? error : new Error("Voice connection timeout");
  }

  const queue = new GuildMusicQueue(guild.id, voiceChannel.id, connection, textChannel, (guildId) =>
    destroyQueue(guildId),
  );
  queues.set(guild.id, queue);
  return queue;
}

/** Cari 1 lagu YouTube dari query teks atau URL langsung. */
export async function resolveTrack(
  query: string,
  requestedById: string,
  requestedByTag: string,
): Promise<Track | null> {
  const isUrl = play.yt_validate(query) === "video";
  const results = isUrl
    ? [(await play.video_basic_info(query)).video_details]
    : await play.search(query, { limit: 1, source: { youtube: "video" } });

  const video = results[0];
  if (!video?.url) return null;

  const durationSec = video.durationInSec ?? 0;
  return {
    title: video.title ?? "Judul tidak diketahui",
    url: video.url,
    thumbnail: video.thumbnails?.[0]?.url,
    durationSec,
    durationLabel: video.durationRaw || "LIVE",
    requestedById,
    requestedByTag,
  };
}
