import { SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed, warningEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";
import {
  createQueue,
  destroyQueue,
  getQueue,
  resolveTrack,
} from "../../services/music/musicManager";
import { formatDuration, type LoopMode } from "../../services/music/types";

const LOOP_CHOICE = {
  off: "🔁 Loop dinonaktifkan.",
  track: "🔂 Loop **satu lagu** aktif.",
  queue: "🔁 Loop **antrean** aktif.",
};
const LOOP_LABEL = { off: "Nonaktif", track: "Satu lagu", queue: "Antrean" } as const;
const MAX_LISTED = 10;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Pemutar musik YouTube.")
    .addSubcommand((s) =>
      s
        .setName("play")
        .setDescription("Putar lagu dari YouTube (judul atau URL).")
        .addStringOption((o) =>
          o.setName("lagu").setDescription("Judul lagu atau URL YouTube").setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("skip").setDescription("Lewati lagu sekarang."))
    .addSubcommand((s) => s.setName("stop").setDescription("Hentikan & keluar dari voice."))
    .addSubcommand((s) => s.setName("pause").setDescription("Jeda lagu."))
    .addSubcommand((s) => s.setName("resume").setDescription("Lanjutkan lagu."))
    .addSubcommand((s) => s.setName("queue").setDescription("Lihat antrean."))
    .addSubcommand((s) => s.setName("nowplaying").setDescription("Lagu yang sedang diputar."))
    .addSubcommand((s) =>
      s
        .setName("loop")
        .setDescription("Atur mode pengulangan.")
        .addStringOption((o) =>
          o
            .setName("mode")
            .setDescription("Mode loop")
            .setRequired(true)
            .addChoices(
              { name: "Nonaktif", value: "off" },
              { name: "Satu lagu", value: "track" },
              { name: "Antrean", value: "queue" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("volume")
        .setDescription("Atur volume (0-200%).")
        .addIntegerOption((o) =>
          o
            .setName("persen")
            .setDescription("0-200")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(200),
        ),
    )
    .addSubcommand((s) => s.setName("shuffle").setDescription("Acak antrean.")),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "play") {
      const voiceChannel = await ensureVoiceContext(interaction);
      if (!voiceChannel || !interaction.guild) return;

      await interaction.deferReply();
      const query = interaction.options.getString("lagu", true);
      const track = await resolveTrack(query, interaction.user.id, interaction.user.tag);
      if (!track) {
        await interaction.editReply({
          embeds: [errorEmbed(`Tidak ada hasil untuk **${query}**.`)],
        });
        return;
      }

      let queue = getQueue(interaction.guild.id);
      const startedEmpty = !queue?.current;
      try {
        queue ??= await createQueue(
          interaction.guild,
          voiceChannel,
          interaction.channel as GuildTextBasedChannel,
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : "timeout";
        await interaction.editReply({
          embeds: [
            errorEmbed(
              `Gagal terhubung ke voice channel: ${detail}. Jika ini timeout, kemungkinan hosting memblokir UDP untuk voice.`,
            ),
          ],
        });
        return;
      }

      queue.enqueue(track);
      await queue.start();

      const embed = buildEmbed("success")
        .setTitle(startedEmpty ? "▶️ Sekarang Memutar" : "➕ Ditambahkan ke Antrean")
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
          { name: "Durasi", value: track.durationLabel, inline: true },
          { name: "Diminta oleh", value: `<@${track.requestedById}>`, inline: true },
        );
      if (!startedEmpty) {
        embed.addFields({ name: "Posisi antrean", value: `#${queue.tracks.length}`, inline: true });
      }
      if (track.thumbnail) embed.setThumbnail(track.thumbnail);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "stop") {
      if (!(await ensureVoiceContext(interaction))) return;
      const queue = getQueue(interaction.guildId);
      if (!queue) {
        await interaction.reply({
          embeds: [successEmbed("Tidak ada yang diputar. Bot sudah keluar.")],
          ephemeral: true,
        });
        return;
      }
      destroyQueue(interaction.guildId);
      await interaction.reply({
        embeds: [successEmbed("⏹️ Musik dihentikan dan antrean dikosongkan.")],
      });
      return;
    }

    if (sub === "queue") {
      const queue = await requireActiveQueue(interaction);
      if (!queue || !queue.current) return;
      const upcoming = queue.tracks
        .slice(0, MAX_LISTED)
        .map(
          (t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) — \`${formatDuration(t.durationSec)}\``,
        )
        .join("\n");
      const remaining = queue.tracks.length - MAX_LISTED;
      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle("📜 Antrean Musik")
            .setDescription(
              `**Sedang diputar:**\n[${queue.current.title}](${queue.current.url})\n\n` +
                (queue.tracks.length > 0
                  ? `**Berikutnya:**\n${upcoming}${remaining > 0 ? `\n\n…dan ${remaining} lagu lagi.` : ""}`
                  : "_Antrean kosong._"),
            )
            .setFooter({ text: `Total ${queue.tracks.length} lagu dalam antrean` }),
        ],
      });
      return;
    }

    if (sub === "nowplaying") {
      const queue = await requireActiveQueue(interaction);
      if (!queue || !queue.current) return;
      const track = queue.current;
      const embed = buildEmbed("primary")
        .setTitle("🎵 Sedang Diputar")
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
          { name: "Durasi", value: formatDuration(track.durationSec), inline: true },
          { name: "Volume", value: `${queue.volume}%`, inline: true },
          { name: "Loop", value: LOOP_LABEL[queue.loop], inline: true },
          { name: "Diminta oleh", value: `<@${track.requestedById}>`, inline: true },
          { name: "Antrean berikutnya", value: `${queue.tracks.length} lagu`, inline: true },
        );
      if (track.thumbnail) embed.setThumbnail(track.thumbnail);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Sisa subcommand butuh berada di voice yang sama + ada lagu aktif.
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    switch (sub) {
      case "skip": {
        const title = queue.current?.title ?? "Lagu";
        queue.skip();
        await interaction.reply({ embeds: [successEmbed(`⏭️ Melewati **${title}**.`)] });
        return;
      }
      case "pause": {
        const paused = queue.pause();
        await interaction.reply({
          embeds: [paused ? successEmbed("⏸️ Lagu dijeda.") : warningEmbed("Lagu sudah dijeda.")],
        });
        return;
      }
      case "resume": {
        const resumed = queue.resume();
        await interaction.reply({
          embeds: [
            resumed ? successEmbed("▶️ Lagu dilanjutkan.") : warningEmbed("Lagu sedang diputar."),
          ],
        });
        return;
      }
      case "loop": {
        const mode = interaction.options.getString("mode", true) as LoopMode;
        queue.setLoop(mode);
        await interaction.reply({ embeds: [successEmbed(LOOP_CHOICE[mode])] });
        return;
      }
      case "volume": {
        const percent = interaction.options.getInteger("persen", true);
        queue.setVolume(percent);
        await interaction.reply({ embeds: [successEmbed(`🔊 Volume diatur ke **${percent}%**.`)] });
        return;
      }
      case "shuffle": {
        if (queue.tracks.length < 2) {
          await interaction.reply({
            embeds: [warningEmbed("Antrean terlalu sedikit untuk diacak.")],
            ephemeral: true,
          });
          return;
        }
        queue.shuffle();
        await interaction.reply({
          embeds: [successEmbed(`🔀 Antrean **${queue.tracks.length} lagu** diacak.`)],
        });
        return;
      }
    }
  },
};

export default command;
