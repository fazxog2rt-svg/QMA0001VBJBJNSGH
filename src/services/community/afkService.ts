import { Member } from "../../database/models/Member";
import { getOrCreateMember } from "../profile/profileService";

export async function setAfk(guildId: string, userId: string, reason: string): Promise<void> {
  const member = await getOrCreateMember(guildId, userId);
  member.isAfk = true;
  member.afkReason = reason;
  member.afkSince = new Date();
  await member.save();
}

export interface ClearAfkResult {
  wasAfk: boolean;
  since?: Date;
}

export async function clearAfkIfNeeded(guildId: string, userId: string): Promise<ClearAfkResult> {
  const member = await Member.findOne({ guildId, userId });
  if (!member?.isAfk) return { wasAfk: false };

  const since = member.afkSince ?? undefined;
  member.isAfk = false;
  member.afkReason = undefined;
  member.afkSince = undefined;
  await member.save();

  return { wasAfk: true, since };
}

export interface AfkMentionInfo {
  userId: string;
  reason: string;
  since: Date;
}

export async function getAfkMentionInfo(
  guildId: string,
  userIds: string[],
): Promise<AfkMentionInfo[]> {
  if (userIds.length === 0) return [];

  const members = await Member.find({ guildId, userId: { $in: userIds }, isAfk: true });
  return members
    .filter((member) => member.afkReason && member.afkSince)
    .map((member) => ({
      userId: member.userId,
      reason: member.afkReason!,
      since: member.afkSince!,
    }));
}
