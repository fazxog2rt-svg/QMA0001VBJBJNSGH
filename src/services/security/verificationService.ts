import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type GuildMember } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { VerificationAttempt } from "../../database/models/VerificationAttempt";
import { buildEmbed } from "../../utils/embed";
import { logToSecurityChannel } from "./securityLogService";
import { logger } from "../../services/logger.service";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function checkAltAccount(member: GuildMember, minAccountAgeHours: number): Promise<boolean> {
  const accountAgeHours = (Date.now() - member.user.createdTimestamp) / 3_600_000;
  if (accountAgeHours >= minAccountAgeHours) return false;

  await VerificationAttempt.findOneAndUpdate(
    { guildId: member.guild.id, userId: member.id },
    {
      method: "manual",
      status: "flagged",
      accountAgeHours: Math.round(accountAgeHours),
      flaggedReason: `Akun dibuat ${Math.round(accountAgeHours)} jam lalu (< ${minAccountAgeHours} jam)`,
    },
    { upsert: true },
  );

  await logToSecurityChannel(
    member.guild,
    buildEmbed("warning")
      .setTitle("🕵️ Kemungkinan Akun Alt Terdeteksi")
      .setDescription(
        `${member} baru dibuat ${Math.round(accountAgeHours)} jam lalu. Mohon tinjau member ini.`,
      ),
  );

  return true;
}

async function startCaptchaChallenge(member: GuildMember, unverifiedRoleId: string): Promise<void> {
  await member.roles.add(unverifiedRoleId, "Menunggu verifikasi captcha").catch(() => undefined);

  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  const correctAnswer = a + b;
  const wrongAnswers = new Set<number>();
  while (wrongAnswers.size < 2) {
    const candidate = correctAnswer + randomInt(-5, 5);
    if (candidate !== correctAnswer && candidate > 0) wrongAnswers.add(candidate);
  }

  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    options.map((value) =>
      new ButtonBuilder()
        .setCustomId(
          `security:captcha:${member.id}:${value === correctAnswer ? "correct" : "wrong"}`,
        )
        .setLabel(String(value))
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  await VerificationAttempt.findOneAndUpdate(
    { guildId: member.guild.id, userId: member.id },
    { method: "captcha", status: "pending", attempts: 0 },
    { upsert: true },
  );

  const dmSent = await member
    .send({
      embeds: [
        buildEmbed("primary")
          .setTitle(`🔐 Verifikasi keanggotaan di ${member.guild.name}`)
          .setDescription(
            `Berapa hasil dari **${a} + ${b}**? Klik jawaban yang benar untuk mendapatkan akses ke server.`,
          ),
      ],
      components: [row],
    })
    .then(() => true)
    .catch(() => false);

  if (!dmSent) {
    await logToSecurityChannel(
      member.guild,
      buildEmbed("warning")
        .setTitle("⚠️ Gagal Mengirim Captcha")
        .setDescription(`${member} tidak bisa menerima DM. Verifikasi manual diperlukan.`),
    );
  }
}

export async function runJoinSecurityChecks(member: GuildMember): Promise<void> {
  const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!guildConfig?.security) return;

  try {
    await checkAltAccount(member, guildConfig.security.altDetectionMinAccountAgeHours);

    if (guildConfig.security.captchaVerification && guildConfig.security.unverifiedRoleId) {
      await startCaptchaChallenge(member, guildConfig.security.unverifiedRoleId);
    }
  } catch (error) {
    logger.error("Gagal menjalankan pemeriksaan keamanan saat member join", {
      error: error instanceof Error ? error.message : error,
    });
  }
}
