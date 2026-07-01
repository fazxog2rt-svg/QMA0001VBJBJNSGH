import type { MemberDocument } from "../../database/models/Member";
import { GuildConfig } from "../../database/models/GuildConfig";
import { DAILY_COOLDOWN_HOURS, DAILY_STREAK_GRACE_HOURS } from "../../config/constants";
import { getOrCreateMember } from "../profile/profileService";

export interface DailyClaimResult {
  claimed: boolean;
  amount: number;
  streak: number;
  nextClaimInMs?: number;
  member: MemberDocument;
}

export async function claimDaily(guildId: string, userId: string): Promise<DailyClaimResult> {
  const member = await getOrCreateMember(guildId, userId);
  const now = Date.now();

  if (member.lastDailyClaimAt) {
    const cooldownExpiresAt = member.lastDailyClaimAt.getTime() + DAILY_COOLDOWN_HOURS * 3_600_000;
    if (now < cooldownExpiresAt) {
      return {
        claimed: false,
        amount: 0,
        streak: member.dailyStreak,
        nextClaimInMs: cooldownExpiresAt - now,
        member,
      };
    }
  }

  const withinStreakGrace = member.lastDailyClaimAt
    ? now - member.lastDailyClaimAt.getTime() <= DAILY_STREAK_GRACE_HOURS * 3_600_000
    : false;

  const newStreak = withinStreakGrace ? member.dailyStreak + 1 : 1;

  const guildConfig = await GuildConfig.findOne({ guildId });
  const baseAmount = guildConfig?.economy?.dailyAmount ?? 100;
  const streakBonus = Math.min(newStreak, 30) * 5;
  const amount = baseAmount + streakBonus;

  member.walletBalance += amount;
  member.dailyStreak = newStreak;
  member.lastDailyClaimAt = new Date();
  await member.save();

  return { claimed: true, amount, streak: newStreak, member };
}
