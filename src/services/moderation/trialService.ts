import type { HydratedDocument } from "mongoose";
import type { BotClient } from "../../client";
import { Trial, type TrialDocument } from "../../database/models/Trial";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";

export interface CreateTrialInput {
  guildId: string;
  defendantId: string;
  reason: string;
  type: "terbuka" | "tertutup";
  scheduledAt: Date;
  announceChannelId: string;
  createdBy: string;
  minLevel?: number;
  roleId?: string;
  allowedUserIds?: string[];
}

async function nextCaseNumber(guildId: string): Promise<number> {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $inc: { "sidang.nextTrialNumber": 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return (config.sidang?.nextTrialNumber ?? 2) - 1;
}

export async function createTrial(
  input: CreateTrialInput,
): Promise<HydratedDocument<TrialDocument>> {
  const caseNumber = await nextCaseNumber(input.guildId);
  return Trial.create({
    guildId: input.guildId,
    caseNumber,
    defendantId: input.defendantId,
    reason: input.reason,
    type: input.type,
    scheduledAt: input.scheduledAt,
    announceChannelId: input.announceChannelId,
    createdBy: input.createdBy,
    requirement: { minLevel: input.minLevel ?? 0, roleId: input.roleId },
    allowedUserIds: input.allowedUserIds ?? [],
  });
}

export function getTrial(guildId: string, caseNumber: number) {
  return Trial.findOne({ guildId, caseNumber });
}

export function listActiveTrials(guildId: string) {
  return Trial.find({ guildId, status: { $in: ["dijadwalkan", "berlangsung"] } }).sort({
    scheduledAt: 1,
  });
}

export interface JoinResult {
  ok: boolean;
  error?: string;
}

/** Coba gabung sidang; cek tipe (terbuka/tertutup) & syarat. */
export async function joinTrial(
  guildId: string,
  caseNumber: number,
  userId: string,
  ctx: { level: number; roleIds: string[] },
): Promise<JoinResult> {
  const trial = await getTrial(guildId, caseNumber);
  if (!trial || trial.status === "selesai" || trial.status === "dibatalkan") {
    return { ok: false, error: "Sidang tidak ditemukan atau sudah selesai." };
  }
  if (trial.defendantId === userId)
    return { ok: false, error: "Terdakwa tidak bisa mendaftar sebagai peserta." };
  if (trial.participants.includes(userId))
    return { ok: false, error: "Kamu sudah terdaftar di sidang ini." };

  if (trial.type === "tertutup") {
    if (!trial.allowedUserIds.includes(userId)) {
      return {
        ok: false,
        error: "Sidang ini **tertutup**. Kamu tidak termasuk pihak yang diizinkan.",
      };
    }
  } else {
    // terbuka — cek syarat
    const minLevel = trial.requirement?.minLevel ?? 0;
    if (ctx.level < minLevel) {
      return {
        ok: false,
        error: `Syarat tidak terpenuhi: minimal **level ${minLevel}** untuk ikut.`,
      };
    }
    const roleId = trial.requirement?.roleId;
    if (roleId && !ctx.roleIds.includes(roleId)) {
      return { ok: false, error: `Syarat tidak terpenuhi: kamu harus punya role <@&${roleId}>.` };
    }
  }

  trial.participants.push(userId);
  await trial.save();
  return { ok: true };
}

export function buildTrialEmbed(trial: HydratedDocument<TrialDocument>) {
  const ts = Math.floor(trial.scheduledAt.getTime() / 1000);
  const statusLabel = {
    dijadwalkan: "🕒 Dijadwalkan",
    berlangsung: "⚖️ Sedang Berlangsung",
    selesai: "✅ Selesai",
    dibatalkan: "❌ Dibatalkan",
  }[trial.status];

  const embed = buildEmbed(trial.status === "berlangsung" ? "warning" : "primary")
    .setTitle(`⚖️ Sidang #${trial.caseNumber}`)
    .addFields(
      { name: "Terdakwa", value: `<@${trial.defendantId}>`, inline: true },
      {
        name: "Tipe",
        value: trial.type === "terbuka" ? "🔓 Terbuka" : "🔒 Tertutup",
        inline: true,
      },
      { name: "Status", value: statusLabel, inline: true },
      { name: "Jadwal", value: `<t:${ts}:F> (<t:${ts}:R>)` },
      { name: "Perkara", value: trial.reason },
    );

  if (trial.type === "terbuka") {
    const syarat: string[] = [];
    if (trial.requirement?.minLevel) syarat.push(`Min. level ${trial.requirement.minLevel}`);
    if (trial.requirement?.roleId) syarat.push(`Role <@&${trial.requirement.roleId}>`);
    embed.addFields({
      name: "Syarat Ikut",
      value: syarat.length > 0 ? syarat.join(" · ") : "Bebas (tanpa syarat)",
    });
  }
  embed.addFields({
    name: "Peserta terdaftar",
    value: `${trial.participants.length} orang`,
    inline: true,
  });
  if (trial.verdict) embed.addFields({ name: "Putusan", value: trial.verdict });

  return embed;
}

/** Scheduler: umumkan sidang yang waktunya tiba (dijadwalkan → berlangsung). */
export async function runDueTrials(client: BotClient): Promise<void> {
  const due = await Trial.find({
    status: "dijadwalkan",
    startedAnnounced: false,
    scheduledAt: { $lte: new Date() },
  });

  for (const trial of due) {
    try {
      const channel = await client.channels.fetch(trial.announceChannelId).catch(() => null);
      trial.status = "berlangsung";
      trial.startedAnnounced = true;
      await trial.save();

      if (channel?.isTextBased() && "send" in channel) {
        await channel.send({
          content: `⚖️ Sidang **#${trial.caseNumber}** untuk <@${trial.defendantId}> **dimulai sekarang**!`,
          embeds: [buildTrialEmbed(trial)],
        });
      }
    } catch (error) {
      logger.warn("Gagal mengumumkan sidang", {
        caseNumber: trial.caseNumber,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
