import type { HydratedDocument } from "mongoose";
import type { BotClient } from "../../client";
import { Faction, type FactionDocument } from "../../database/models/Faction";
import { FactionMember } from "../../database/models/FactionMember";
import { GuildConfig } from "../../database/models/GuildConfig";
import { adjustWallet } from "../economy/economyService";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;
// 1 poin kontribusi tiap donasi 100 coins.
const DONATION_POINTS_PER_100 = 1;

export interface FactionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeColor(input: string | null | undefined): string {
  if (!input || !HEX_PATTERN.test(input.trim())) return "#5865f2";
  const hex = input.trim();
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function getUserFaction(guildId: string, userId: string) {
  return FactionMember.findOne({ guildId, userId });
}

export function getFactionByName(guildId: string, name: string) {
  return Faction.findOne({ guildId, nameKey: normalizeName(name) });
}

/** Buat faksi baru; pembuat jadi leader & anggota pertama. Menarik biaya coins. */
export async function createFaction(
  guildId: string,
  userId: string,
  input: { name: string; emoji?: string; color?: string },
): Promise<FactionResult<HydratedDocument<FactionDocument>>> {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 32) {
    return { ok: false, error: "Nama faksi harus 3-32 karakter." };
  }

  const existingMembership = await getUserFaction(guildId, userId);
  if (existingMembership) {
    return {
      ok: false,
      error: "Kamu sudah tergabung di sebuah faksi. Keluar dulu (`/faksi keluar`).",
    };
  }

  const nameKey = normalizeName(name);
  const duplicate = await Faction.findOne({ guildId, nameKey });
  if (duplicate) return { ok: false, error: "Sudah ada faksi dengan nama itu." };

  const config = await GuildConfig.findOne({ guildId });
  const cost = config?.faksi?.createCost ?? 5000;

  const debit = await adjustWallet(guildId, userId, -cost);
  if (!debit.success) {
    return {
      ok: false,
      error: `Butuh ${cost} coins untuk membuat faksi. Saldo wallet-mu tidak cukup.`,
    };
  }

  try {
    const faction = await Faction.create({
      guildId,
      name,
      nameKey,
      emoji: input.emoji?.trim() || "🏳️",
      color: normalizeColor(input.color),
      leaderId: userId,
      createdBy: userId,
      memberCount: 1,
    });
    await FactionMember.create({ guildId, userId, factionId: faction._id });
    return { ok: true, data: faction };
  } catch (error) {
    // Kegagalan setelah debit: kembalikan coins agar tidak hangus.
    await adjustWallet(guildId, userId, cost).catch(() => undefined);
    logger.warn("Gagal membuat faksi, coins dikembalikan", {
      guildId,
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return { ok: false, error: "Gagal membuat faksi. Coba lagi." };
  }
}

export async function joinFaction(
  guildId: string,
  userId: string,
  name: string,
): Promise<FactionResult<HydratedDocument<FactionDocument>>> {
  const existing = await getUserFaction(guildId, userId);
  if (existing) return { ok: false, error: "Kamu sudah tergabung di sebuah faksi." };

  const faction = await getFactionByName(guildId, name);
  if (!faction) return { ok: false, error: "Faksi tidak ditemukan." };

  await FactionMember.create({ guildId, userId, factionId: faction._id });
  faction.memberCount += 1;
  await faction.save();
  return { ok: true, data: faction };
}

/** Keluar dari faksi. Leader tidak bisa keluar kecuali membubarkan faksi. */
export async function leaveFaction(guildId: string, userId: string): Promise<FactionResult> {
  const membership = await getUserFaction(guildId, userId);
  if (!membership) return { ok: false, error: "Kamu belum tergabung di faksi mana pun." };

  const faction = await Faction.findById(membership.factionId);
  if (faction && faction.leaderId === userId) {
    return {
      ok: false,
      error:
        "Kamu leader faksi. Bubarkan faksi dengan `/faksi bubar` atau serahkan kepemimpinan dulu.",
    };
  }

  await FactionMember.deleteOne({ _id: membership._id });
  if (faction) {
    faction.memberCount = Math.max(0, faction.memberCount - 1);
    await faction.save();
  }
  return { ok: true };
}

/** Bubarkan faksi (leader only). Hapus semua keanggotaan. */
export async function disbandFaction(guildId: string, userId: string): Promise<FactionResult> {
  const membership = await getUserFaction(guildId, userId);
  if (!membership) return { ok: false, error: "Kamu belum tergabung di faksi mana pun." };

  const faction = await Faction.findById(membership.factionId);
  if (!faction) return { ok: false, error: "Faksi tidak ditemukan." };
  if (faction.leaderId !== userId) {
    return { ok: false, error: "Hanya leader yang bisa membubarkan faksi." };
  }

  await FactionMember.deleteMany({ guildId, factionId: faction._id });
  await Faction.deleteOne({ _id: faction._id });
  return { ok: true };
}

/** Donasi coins dari wallet ke kas faksi; menambah poin kontribusi & mingguan. */
export async function donateToFaction(
  guildId: string,
  userId: string,
  amount: number,
): Promise<FactionResult<{ faction: HydratedDocument<FactionDocument>; points: number }>> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Jumlah donasi harus lebih dari 0." };
  }

  const membership = await getUserFaction(guildId, userId);
  if (!membership) return { ok: false, error: "Kamu belum tergabung di faksi mana pun." };

  const debit = await adjustWallet(guildId, userId, -amount);
  if (!debit.success) return { ok: false, error: "Saldo wallet-mu tidak cukup." };

  const points = Math.floor(amount / 100) * DONATION_POINTS_PER_100;
  const faction = await Faction.findByIdAndUpdate(
    membership.factionId,
    { $inc: { treasury: amount, weeklyPoints: points, totalPoints: points } },
    { new: true },
  );
  if (!faction) {
    await adjustWallet(guildId, userId, amount).catch(() => undefined);
    return { ok: false, error: "Faksi tidak ditemukan." };
  }

  await FactionMember.updateOne({ _id: membership._id }, { $inc: { contribution: points } });
  return { ok: true, data: { faction, points } };
}

/**
 * Tambah poin kontribusi dari aktivitas (mis. tiap kali member dapat XP pesan
 * atau menang kuis). Aman dipanggil untuk user yang tidak punya faksi (no-op).
 */
export async function addFactionContribution(
  guildId: string,
  userId: string,
  points: number,
): Promise<void> {
  if (points <= 0) return;
  const membership = await FactionMember.findOne({ guildId, userId });
  if (!membership) return;

  await Promise.all([
    Faction.updateOne(
      { _id: membership.factionId },
      { $inc: { weeklyPoints: points, totalPoints: points } },
    ),
    FactionMember.updateOne({ _id: membership._id }, { $inc: { contribution: points } }),
  ]);
}

export function listFactions(guildId: string, limit = 10) {
  return Faction.find({ guildId }).sort({ weeklyPoints: -1, totalPoints: -1 }).limit(limit);
}

export async function buildFactionEmbed(faction: HydratedDocument<FactionDocument>) {
  const topMembers = await FactionMember.find({ guildId: faction.guildId, factionId: faction._id })
    .sort({ contribution: -1 })
    .limit(5);

  const membersText =
    topMembers.length > 0
      ? topMembers.map((m, i) => `${i + 1}. <@${m.userId}> — ${m.contribution} poin`).join("\n")
      : "_Belum ada kontribusi._";

  return buildEmbed("primary")
    .setColor((faction.color as `#${string}`) ?? "#5865f2")
    .setTitle(`${faction.emoji} ${faction.name}`)
    .addFields(
      { name: "👑 Leader", value: `<@${faction.leaderId}>`, inline: true },
      { name: "👥 Anggota", value: `${faction.memberCount}`, inline: true },
      { name: "🏆 Menang", value: `${faction.wins}`, inline: true },
      { name: "💰 Kas", value: `${faction.treasury}`, inline: true },
      { name: "📊 Poin Minggu Ini", value: `${faction.weeklyPoints}`, inline: true },
      { name: "⭐ Total Poin", value: `${faction.totalPoints}`, inline: true },
    )
    .addFields({ name: "Kontributor Teratas", value: membersText });
}

/**
 * Perang Faksi mingguan: untuk tiap guild yang punya faksi, tentukan juara pekan
 * ini (poin mingguan tertinggi), beri hadiah kas + catat kemenangan, umumkan,
 * lalu reset poin mingguan semua faksi. Dipanggil scheduler seminggu sekali.
 */
export async function runWeeklyFactionWar(client: BotClient): Promise<void> {
  const guildIds = await Faction.distinct("guildId");
  for (const guildId of guildIds) {
    try {
      await resetFactionWarForGuild(client, guildId);
    } catch (error) {
      logger.warn("Gagal memproses perang faksi", {
        guildId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

/** Tentukan juara, beri hadiah, umumkan, lalu reset poin mingguan — satu guild. */
export async function resetFactionWarForGuild(client: BotClient, guildId: string): Promise<void> {
  const factions = await Faction.find({ guildId }).sort({ weeklyPoints: -1 });
  if (factions.length === 0) return;

  const winner = factions[0]!;
  const config = await GuildConfig.findOne({ guildId });

  // Tidak ada pemenang bermakna jika semua 0 poin — tetap reset & catat waktu.
  if (winner.weeklyPoints > 0) {
    const reward = config?.faksi?.weeklyRewardBase ?? 10000;
    winner.treasury += reward;
    winner.wins += 1;
    await winner.save();

    const channelId = config?.faksi?.announceChannelId;
    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const standings = factions
          .slice(0, 5)
          .map(
            (f, i) =>
              `${["🥇", "🥈", "🥉"][i] ?? `**${i + 1}.**`} ${f.emoji} **${f.name}** — ${f.weeklyPoints} poin`,
          )
          .join("\n");
        await channel
          .send({
            embeds: [
              buildEmbed("premium")
                .setTitle("⚔️ Hasil Perang Faksi Pekan Ini")
                .setDescription(
                  `Juara pekan ini: ${winner.emoji} **${winner.name}**! ` +
                    `Kas faksi bertambah **${reward}** coins. 🎉\n\n**Klasemen:**\n${standings}`,
                )
                .setFooter({ text: "Poin mingguan direset. Perang baru dimulai!" }),
            ],
          })
          .catch(() => undefined);
      }
    }
  }

  await Faction.updateMany({ guildId }, { $set: { weeklyPoints: 0 } });
  await GuildConfig.updateOne(
    { guildId },
    { $set: { "faksi.lastWarResetAt": new Date() } },
    { upsert: true },
  );
}
