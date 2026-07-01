import type { HydratedDocument } from "mongoose";
import { Member, type MemberDocument } from "../../database/models/Member";
import {
  ACHIEVEMENT_DEFINITIONS,
  BADGE_DEFINITIONS,
  type AchievementKey,
  type BadgeKey,
} from "../../config/constants";

export async function getOrCreateMember(
  guildId: string,
  userId: string,
): Promise<HydratedDocument<MemberDocument>> {
  const member = await Member.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId, firstSeenAt: new Date() } },
    { upsert: true, new: true },
  );
  return member;
}

export interface ProfileEditInput {
  bio?: string;
  pronouns?: string;
  favoriteColor?: string;
  socialMedia?: Record<string, string>;
}

export async function updateProfile(
  guildId: string,
  userId: string,
  input: ProfileEditInput,
): Promise<HydratedDocument<MemberDocument>> {
  const member = await getOrCreateMember(guildId, userId);

  if (input.bio !== undefined) member.bio = input.bio;
  if (input.pronouns !== undefined) member.pronouns = input.pronouns;
  if (input.favoriteColor !== undefined) member.favoriteColor = input.favoriteColor;
  if (input.socialMedia) {
    member.socialMedia = new Map(Object.entries(input.socialMedia));
  }

  await member.save();
  return member;
}

export async function updateBanner(
  guildId: string,
  userId: string,
  bannerUrl: string,
): Promise<HydratedDocument<MemberDocument>> {
  const member = await getOrCreateMember(guildId, userId);
  member.bannerUrl = bannerUrl;
  await member.save();
  return member;
}

/** Parses lines like "Instagram: @user" into a { instagram: "@user" } map. */
export function parseSocialMediaText(input: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of input.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const platform = line.slice(0, separatorIndex).trim();
    const handle = line.slice(separatorIndex + 1).trim();
    if (platform && handle) entries[platform] = handle;
  }

  return entries;
}

export function formatSocialMediaText(
  socialMedia: Map<string, string> | Record<string, string>,
): string {
  const entries =
    socialMedia instanceof Map ? Array.from(socialMedia.entries()) : Object.entries(socialMedia);
  return entries.map(([platform, handle]) => `${platform}: ${handle}`).join("\n");
}

export interface AchievementProgress {
  key: AchievementKey;
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
}

const METRIC_ACCESSORS: Record<string, (member: MemberDocument) => number> = {
  messageCount: (member) => member.messageCount,
  voiceMinutes: (member) => member.voiceMinutes,
  dailyStreak: (member) => member.dailyStreak,
  boosts: (member) => member.boosts,
  ticketsClaimed: (member) => member.ticketsClaimed,
  aiUsageCount: (member) => member.aiUsageCount,
  reputation: (member) => member.reputation,
};

export function computeAchievementProgress(member: MemberDocument): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const accessor = METRIC_ACCESSORS[definition.metric];
    const progress = accessor ? accessor(member) : 0;

    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      progress: Math.min(progress, definition.target),
      target: definition.target,
      completed: progress >= definition.target,
    };
  });
}

export function findBadgeDefinition(key: BadgeKey) {
  return BADGE_DEFINITIONS.find((badge) => badge.key === key);
}

export async function grantBadge(
  guildId: string,
  userId: string,
  key: BadgeKey,
  awardedBy: string,
): Promise<HydratedDocument<MemberDocument>> {
  const member = await getOrCreateMember(guildId, userId);

  if (!member.badges.some((badge) => badge.key === key)) {
    member.badges.push({ key, awardedAt: new Date(), awardedBy });
    await member.save();
  }

  return member;
}

export async function revokeBadge(
  guildId: string,
  userId: string,
  key: BadgeKey,
): Promise<HydratedDocument<MemberDocument>> {
  const member = await getOrCreateMember(guildId, userId);
  member.badges = member.badges.filter((badge) => badge.key !== key) as typeof member.badges;
  await member.save();
  return member;
}
