import { GuildVerificationLevel, type GuildMember } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { SlidingWindowTracker } from "./slidingWindowTracker";
import { logToSecurityChannel } from "./securityLogService";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

const RAID_LOCKDOWN_DURATION_MS = 10 * 60 * 1000;
const joinTracker = new SlidingWindowTracker();

export async function checkAntiRaid(member: GuildMember): Promise<void> {
  const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!guildConfig?.security?.antiRaid) return;

  const windowMs = guildConfig.security.raidJoinWindowSeconds * 1000;
  const count = joinTracker.record(member.guild.id, windowMs);

  if (count !== guildConfig.security.raidJoinThreshold) return;

  await logToSecurityChannel(
    member.guild,
    buildEmbed("danger")
      .setTitle("🚨 Kemungkinan Raid Terdeteksi")
      .setDescription(
        `${count} member bergabung dalam ${guildConfig.security.raidJoinWindowSeconds} detik terakhir. Verification level server dinaikkan sementara ke **High** selama 10 menit.`,
      ),
  );

  try {
    const previousLevel = member.guild.verificationLevel;
    await member.guild.setVerificationLevel(
      GuildVerificationLevel.High,
      "Anti-raid: lonjakan member baru terdeteksi",
    );

    setTimeout(() => {
      member.guild
        .setVerificationLevel(previousLevel, "Anti-raid: masa lockdown selesai")
        .catch((error) => {
          logger.warn("Gagal mengembalikan verification level", {
            error: error instanceof Error ? error.message : error,
          });
        });
    }, RAID_LOCKDOWN_DURATION_MS);
  } catch (error) {
    logger.warn("Gagal menaikkan verification level untuk anti-raid", {
      error: error instanceof Error ? error.message : error,
    });
  }
}
