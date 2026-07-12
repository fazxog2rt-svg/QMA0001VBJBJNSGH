import type { HydratedDocument } from "mongoose";
import type { BotClient } from "../../client";
import { Season, type SeasonDocument } from "../../database/models/Season";
import { SeasonProgress, type SeasonProgressDocument } from "../../database/models/SeasonProgress";
import { GuildConfig } from "../../database/models/GuildConfig";
import { adjustWallet } from "../economy/economyService";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";
import {
  DAILY_MISSIONS,
  MAX_TIER,
  PREMIUM_COST,
  WEEKLY_MISSIONS,
  XP_PER_TIER,
  freeTierReward,
  premiumTierReward,
  tierFromXp,
  type MissionTemplate,
} from "../../config/season";

export interface SeasonResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Kunci hari (WIB) untuk reset misi harian. */
function dayKeyWIB(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
}

/** Kunci pekan (tahun + nomor pekan ISO, WIB) untuk reset misi mingguan. */
function weekKeyWIB(date = new Date()): string {
  const wib = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const target = new Date(Date.UTC(wib.getFullYear(), wib.getMonth(), wib.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function instantiateMissions(templates: MissionTemplate[]) {
  return templates.map((t) => ({
    key: t.key,
    label: t.label,
    type: t.type,
    target: t.target,
    xp: t.xp,
    progress: 0,
    completed: false,
  }));
}

export function getActiveSeason(guildId: string) {
  return Season.findOne({ guildId, active: true });
}

/** Mulai musim baru; tutup musim aktif sebelumnya bila ada. */
export async function startSeason(
  guildId: string,
  name: string,
  durationDays: number,
): Promise<SeasonResult<HydratedDocument<SeasonDocument>>> {
  const days = Math.min(120, Math.max(1, durationDays));
  const previous = await Season.findOne({ guildId }).sort({ seasonNumber: -1 });
  const seasonNumber = (previous?.seasonNumber ?? 0) + 1;

  await Season.updateMany({ guildId, active: true }, { $set: { active: false } });

  const now = new Date();
  const season = await Season.create({
    guildId,
    seasonNumber,
    name: name.trim() || `Musim ${seasonNumber}`,
    startsAt: now,
    endsAt: new Date(now.getTime() + days * 86_400_000),
    active: true,
  });
  return { ok: true, data: season };
}

/** Tutup musim aktif guild (tanpa memulai yang baru). */
export async function endSeason(guildId: string): Promise<boolean> {
  const res = await Season.updateMany({ guildId, active: true }, { $set: { active: false } });
  return res.modifiedCount > 0;
}

/** Ambil / buat progres member untuk musim aktif, sekaligus refresh misi. */
export async function getOrCreateProgress(
  guildId: string,
  userId: string,
): Promise<{
  season: HydratedDocument<SeasonDocument>;
  progress: HydratedDocument<SeasonProgressDocument>;
} | null> {
  const season = await getActiveSeason(guildId);
  if (!season) return null;

  let progress = await SeasonProgress.findOne({
    guildId,
    userId,
    seasonNumber: season.seasonNumber,
  });
  if (!progress) {
    progress = await SeasonProgress.create({
      guildId,
      userId,
      seasonNumber: season.seasonNumber,
      dailyMissions: instantiateMissions(DAILY_MISSIONS),
      weeklyMissions: instantiateMissions(WEEKLY_MISSIONS),
      lastDailyResetDay: dayKeyWIB(),
      lastWeeklyResetKey: weekKeyWIB(),
    });
    return { season, progress };
  }

  let dirty = false;
  const today = dayKeyWIB();
  if (progress.lastDailyResetDay !== today) {
    progress.set("dailyMissions", instantiateMissions(DAILY_MISSIONS));
    progress.lastDailyResetDay = today;
    dirty = true;
  }
  const thisWeek = weekKeyWIB();
  if (progress.lastWeeklyResetKey !== thisWeek) {
    progress.set("weeklyMissions", instantiateMissions(WEEKLY_MISSIONS));
    progress.lastWeeklyResetKey = thisWeek;
    dirty = true;
  }
  if (dirty) await progress.save();

  return { season, progress };
}

function recomputeTier(progress: HydratedDocument<SeasonProgressDocument>): void {
  progress.tier = tierFromXp(progress.xp);
}

/** Tambah Season XP (aktivitas/kuis) untuk musim aktif. No-op bila tak ada musim. */
export async function addSeasonXp(guildId: string, userId: string, xp: number): Promise<void> {
  if (xp <= 0) return;
  const ctx = await getOrCreateProgress(guildId, userId);
  if (!ctx) return;
  ctx.progress.xp += xp;
  recomputeTier(ctx.progress);
  await ctx.progress.save();
}

/**
 * Catat progres misi bertipe tertentu. Menambah Season XP saat misi selesai.
 * Aman dipanggil untuk user tanpa musim aktif (no-op).
 */
export async function trackSeasonMission(
  guildId: string,
  userId: string,
  type: MissionTemplate["type"],
  amount = 1,
): Promise<void> {
  const ctx = await getOrCreateProgress(guildId, userId);
  if (!ctx) return;
  const { progress } = ctx;

  let earnedXp = 0;
  for (const mission of [...progress.dailyMissions, ...progress.weeklyMissions]) {
    if (mission.completed || mission.type !== type) continue;
    mission.progress += amount;
    if (mission.progress >= mission.target) {
      mission.completed = true;
      earnedXp += mission.xp;
    }
  }

  if (earnedXp > 0) {
    progress.xp += earnedXp;
    recomputeTier(progress);
  }
  await progress.save();
}

export interface ClaimResult {
  claimedTiers: number[];
  coins: number;
}

/** Klaim semua hadiah tier yang sudah dicapai tapi belum diambil. */
export async function claimRewards(
  guildId: string,
  userId: string,
): Promise<SeasonResult<ClaimResult>> {
  const ctx = await getOrCreateProgress(guildId, userId);
  if (!ctx) return { ok: false, error: "Belum ada musim yang berjalan." };
  const { progress } = ctx;

  const claimedFree = new Set(progress.claimedFree);
  const claimedPremium = new Set(progress.claimedPremium);
  const newlyClaimed: number[] = [];
  let coins = 0;

  for (let tier = 1; tier <= progress.tier; tier += 1) {
    if (!claimedFree.has(tier)) {
      coins += freeTierReward(tier);
      claimedFree.add(tier);
      newlyClaimed.push(tier);
    }
    if (progress.premium && !claimedPremium.has(tier)) {
      coins += premiumTierReward(tier);
      claimedPremium.add(tier);
      if (!newlyClaimed.includes(tier)) newlyClaimed.push(tier);
    }
  }

  if (newlyClaimed.length === 0) {
    return { ok: false, error: "Belum ada hadiah baru untuk diklaim. Naikkan tier dulu!" };
  }

  progress.claimedFree = [...claimedFree];
  progress.claimedPremium = [...claimedPremium];
  await progress.save();
  await adjustWallet(guildId, userId, coins);

  return { ok: true, data: { claimedTiers: newlyClaimed.sort((a, b) => a - b), coins } };
}

/** Buka jalur premium dengan coins. */
export async function buyPremium(guildId: string, userId: string): Promise<SeasonResult> {
  const ctx = await getOrCreateProgress(guildId, userId);
  if (!ctx) return { ok: false, error: "Belum ada musim yang berjalan." };
  if (ctx.progress.premium)
    return { ok: false, error: "Kamu sudah punya jalur premium musim ini." };

  const debit = await adjustWallet(guildId, userId, -PREMIUM_COST);
  if (!debit.success) {
    return {
      ok: false,
      error: `Butuh ${PREMIUM_COST} coins untuk membuka premium. Saldo tidak cukup.`,
    };
  }
  ctx.progress.premium = true;
  await ctx.progress.save();
  return { ok: true };
}

function progressBar(xpIntoTier: number): string {
  const filled = Math.round((xpIntoTier / XP_PER_TIER) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export function buildInfoEmbed(
  season: HydratedDocument<SeasonDocument>,
  progress: HydratedDocument<SeasonProgressDocument>,
) {
  const xpIntoTier = progress.xp % XP_PER_TIER;
  const endTs = Math.floor(season.endsAt.getTime() / 1000);
  return buildEmbed("premium")
    .setTitle(`🎟️ ${season.name} — Battle Pass`)
    .setDescription(
      `${progress.premium ? "💎 **Premium**" : "🆓 Jalur Gratis"} • Tier **${progress.tier}/${MAX_TIER}**\n` +
        `\`${progressBar(xpIntoTier)}\` ${xpIntoTier}/${XP_PER_TIER} XP ke tier berikutnya`,
    )
    .addFields(
      { name: "Total Season XP", value: `${progress.xp}`, inline: true },
      { name: "Musim berakhir", value: `<t:${endTs}:R>`, inline: true },
    )
    .setFooter({ text: "Klaim hadiah: /musim klaim • Misi: /musim misi" });
}

export function buildMissionEmbed(progress: HydratedDocument<SeasonProgressDocument>) {
  const fmt = (list: HydratedDocument<SeasonProgressDocument>["dailyMissions"]) =>
    list.length > 0
      ? list
          .map(
            (m) =>
              `${m.completed ? "✅" : "▫️"} ${m.label} — ${Math.min(m.progress, m.target)}/${m.target} _(+${m.xp} XP)_`,
          )
          .join("\n")
      : "_Tidak ada misi._";

  return buildEmbed("primary")
    .setTitle("📋 Misi Musiman")
    .addFields(
      { name: "🗓️ Harian (reset tiap hari)", value: fmt(progress.dailyMissions) },
      { name: "📅 Mingguan (reset tiap pekan)", value: fmt(progress.weeklyMissions) },
    );
}

export function buildPassEmbed(progress: HydratedDocument<SeasonProgressDocument>) {
  const claimedFree = new Set(progress.claimedFree);
  const claimedPremium = new Set(progress.claimedPremium);
  const lines: string[] = [];
  // Tampilkan jendela tier di sekitar posisi pemain agar tidak kepanjangan.
  const from = Math.max(1, progress.tier - 2);
  const to = Math.min(MAX_TIER, from + 9);
  for (let tier = from; tier <= to; tier += 1) {
    const reached = tier <= progress.tier;
    const freeMark = claimedFree.has(tier) ? "✅" : reached ? "🎁" : "🔒";
    const premMark = progress.premium
      ? claimedPremium.has(tier)
        ? "✅"
        : reached
          ? "🎁"
          : "🔒"
      : "🔐";
    lines.push(
      `**T${tier}** — 🆓 ${freeMark} ${freeTierReward(tier)} • 💎 ${premMark} ${premiumTierReward(tier)}`,
    );
  }
  return buildEmbed("premium")
    .setTitle(`🎟️ Reward Track (Tier ${from}-${to})`)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: progress.premium
        ? "Kamu punya premium 💎"
        : `Buka premium (+hadiah) dengan /musim beli-premium (${PREMIUM_COST} coins)`,
    });
}

/** Scheduler: tutup musim yang sudah lewat tanggal berakhir + umumkan. */
export async function endExpiredSeasons(client: BotClient): Promise<void> {
  const expired = await Season.find({ active: true, endsAt: { $lte: new Date() } });
  for (const season of expired) {
    try {
      season.active = false;
      await season.save();

      const config = await GuildConfig.findOne({ guildId: season.guildId });
      const channelId = config?.faksi?.announceChannelId; // pakai channel pengumuman umum
      if (channelId) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel?.isTextBased() && "send" in channel) {
          const top = await SeasonProgress.find({
            guildId: season.guildId,
            seasonNumber: season.seasonNumber,
          })
            .sort({ xp: -1 })
            .limit(3);
          const podium = top
            .map((p, i) => `${["🥇", "🥈", "🥉"][i]} <@${p.userId}> — Tier ${p.tier} (${p.xp} XP)`)
            .join("\n");
          await channel
            .send({
              embeds: [
                buildEmbed("premium")
                  .setTitle(`🏁 ${season.name} telah berakhir!`)
                  .setDescription(
                    (podium || "Belum ada peserta.") +
                      "\n\nMusim baru bisa dimulai admin dengan `/musim mulai`.",
                  ),
              ],
            })
            .catch(() => undefined);
        }
      }
    } catch (error) {
      logger.warn("Gagal menutup musim", {
        guildId: season.guildId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
