import type { Guild, GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { Member, type MemberDocument } from "../../database/models/Member";
import { GuildConfig } from "../../database/models/GuildConfig";
import {
  XP_MESSAGE_COOLDOWN_SECONDS,
  XP_MESSAGE_MAX,
  XP_MESSAGE_MIN,
  XP_VOICE_PER_MINUTE,
  levelFromXp,
} from "../../config/constants";
import { buildEmbed } from "../../utils/embed";
import { cached } from "../cache.service";
import { logger } from "../../services/logger.service";

export interface XpAwardResult {
  member: HydratedDocument<MemberDocument>;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  gainedXp: number;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function awardMessageXp(
  guildId: string,
  userId: string,
): Promise<XpAwardResult | null> {
  const member = await Member.findOneAndUpdate(
    { guildId, userId },
    { $inc: { messageCount: 1 }, $setOnInsert: { guildId, userId, firstSeenAt: new Date() } },
    { upsert: true, new: true },
  );

  const cooldownExpiresAt = member.lastMessageXpAt
    ? member.lastMessageXpAt.getTime() + XP_MESSAGE_COOLDOWN_SECONDS * 1000
    : 0;

  if (Date.now() < cooldownExpiresAt) return null;

  const gainedXp = randomInt(XP_MESSAGE_MIN, XP_MESSAGE_MAX);
  const oldLevel = member.level;
  const newXp = member.xp + gainedXp;
  const newLevel = levelFromXp(newXp);

  member.xp = newXp;
  member.level = newLevel;
  member.lastMessageXpAt = new Date();
  await member.save();

  return { member, oldLevel, newLevel, leveledUp: newLevel > oldLevel, gainedXp };
}

export async function awardVoiceXp(
  guildId: string,
  userId: string,
  minutes: number,
): Promise<XpAwardResult | null> {
  if (minutes <= 0) return null;

  const member = await Member.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId, firstSeenAt: new Date() } },
    { upsert: true, new: true },
  );

  const gainedXp = Math.round(minutes * XP_VOICE_PER_MINUTE);
  const oldLevel = member.level;
  const newXp = member.xp + gainedXp;
  const newLevel = levelFromXp(newXp);

  member.voiceMinutes += Math.round(minutes);
  member.xp = newXp;
  member.level = newLevel;
  await member.save();

  return { member, oldLevel, newLevel, leveledUp: newLevel > oldLevel, gainedXp };
}

export async function grantBonusXp(
  guildId: string,
  userId: string,
  amount: number,
): Promise<XpAwardResult> {
  const member = await Member.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId, firstSeenAt: new Date() } },
    { upsert: true, new: true },
  );

  const oldLevel = member.level;
  const newXp = Math.max(0, member.xp + amount);
  const newLevel = levelFromXp(newXp);

  member.xp = newXp;
  member.level = newLevel;
  await member.save();

  return { member, oldLevel, newLevel, leveledUp: newLevel > oldLevel, gainedXp: amount };
}

export async function applyLevelRoleRewards(
  guild: Guild,
  discordMember: GuildMember,
  newLevel: number,
): Promise<string[]> {
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig) return [];

  const eligibleRewards = guildConfig.leveling!.roleRewards.filter(
    (reward) => reward.level <= newLevel,
  );
  const grantedRoleNames: string[] = [];

  for (const reward of eligibleRewards) {
    if (discordMember.roles.cache.has(reward.roleId)) continue;

    try {
      await discordMember.roles.add(reward.roleId, `Level reward: mencapai level ${reward.level}`);
      const role = guild.roles.cache.get(reward.roleId);
      if (role) grantedRoleNames.push(role.name);
    } catch (error) {
      logger.warn("Gagal memberikan role reward level", {
        guildId: guild.id,
        userId: discordMember.id,
        roleId: reward.roleId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return grantedRoleNames;
}

export async function announceLevelUp(
  guild: Guild,
  discordMember: GuildMember,
  newLevel: number,
  grantedRoleNames: string[],
): Promise<void> {
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig?.leveling?.enabled || !guildConfig.leveling.announceChannelId) return;

  const channel = guild.channels.cache.get(guildConfig.leveling.announceChannelId);
  if (!channel?.isTextBased()) return;

  const description =
    grantedRoleNames.length > 0
      ? `🎉 ${discordMember} naik ke **Level ${newLevel}** dan mendapatkan role: ${grantedRoleNames.join(", ")}!`
      : `🎉 ${discordMember} naik ke **Level ${newLevel}**!`;

  await channel
    .send({ embeds: [buildEmbed("premium").setDescription(description)] })
    .catch(() => undefined);
}

export async function handleLevelUpSideEffects(
  guild: Guild,
  discordMember: GuildMember,
  result: XpAwardResult,
): Promise<void> {
  if (!result.leveledUp) return;
  const grantedRoleNames = await applyLevelRoleRewards(guild, discordMember, result.newLevel);
  await announceLevelUp(guild, discordMember, result.newLevel, grantedRoleNames);
}

export interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  rank: number;
}

export async function getLeaderboard(
  guildId: string,
  limit: number,
  skip: number,
): Promise<LeaderboardEntry[]> {
  // Leaderboards are read-heavy and expensive to sort; cache for 60s per page.
  return cached(`lb:xp:${guildId}:${skip}:${limit}`, 60, async () => {
    const members = await Member.find({ guildId }).sort({ xp: -1 }).skip(skip).limit(limit);
    return members.map((member, index) => ({
      userId: member.userId,
      xp: member.xp,
      level: member.level,
      rank: skip + index + 1,
    }));
  });
}

export async function getRank(guildId: string, userId: string): Promise<number> {
  const member = await Member.findOne({ guildId, userId });
  if (!member) return 0;

  const higherRankedCount = await Member.countDocuments({ guildId, xp: { $gt: member.xp } });
  return higherRankedCount + 1;
}
