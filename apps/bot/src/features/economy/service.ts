import { prisma, TransactionType, type EconomyProfile, type GuildMember } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import { publishRealtimeEvent } from "../../lib/redis";

export async function getOrCreateMember(
  guildId: string,
  discordUserId: string,
  username: string,
  avatarUrl?: string | null,
): Promise<GuildMember> {
  return prisma.guildMember.upsert({
    where: { guildId_discordUserId: { guildId, discordUserId } },
    update: { username, avatarUrl: avatarUrl ?? undefined },
    create: { guildId, discordUserId, username, avatarUrl: avatarUrl ?? null },
  });
}

export async function getOrCreateProfile(
  guildId: string,
  discordUserId: string,
  username: string,
  avatarUrl?: string | null,
): Promise<EconomyProfile & { member: GuildMember }> {
  const member = await getOrCreateMember(guildId, discordUserId, username, avatarUrl);

  const profile = await prisma.economyProfile.upsert({
    where: { memberId: member.id },
    update: {},
    create: { memberId: member.id },
    include: { member: true },
  });

  return profile;
}

/**
 * Adds (or subtracts, with a negative amount) balance to a profile's wallet
 * and writes a Transaction row recording the resulting balance. Wrapped in a
 * transaction to keep the balance read+write+ledger-write atomic.
 */
export async function addBalance(
  profileId: string,
  amount: bigint,
  type: TransactionType,
  note?: string,
): Promise<EconomyProfile> {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.economyProfile.findUniqueOrThrow({ where: { id: profileId } });
    const newWallet = profile.wallet + amount;
    if (newWallet < 0n) {
      throw new Error("Insufficient balance");
    }

    const updated = await tx.economyProfile.update({
      where: { id: profileId },
      data: { wallet: newWallet },
    });

    await tx.transaction.create({
      data: {
        profileId,
        type,
        amount,
        balanceAfter: newWallet,
        note,
      },
    });

    return updated;
  });
}

export interface TransferResult {
  from: EconomyProfile;
  to: EconomyProfile;
}

/** Transfers currency between two profiles atomically, writing a Transaction row for each side. */
export async function transferBalance(
  fromProfileId: string,
  toProfileId: string,
  amount: bigint,
  note?: string,
): Promise<TransferResult> {
  if (amount <= 0n) throw new Error("Transfer amount must be positive");

  return prisma.$transaction(async (tx) => {
    const from = await tx.economyProfile.findUniqueOrThrow({ where: { id: fromProfileId } });
    if (from.wallet < amount) throw new Error("Insufficient balance");

    const fromNewBalance = from.wallet - amount;
    const updatedFrom = await tx.economyProfile.update({
      where: { id: fromProfileId },
      data: { wallet: fromNewBalance },
    });
    await tx.transaction.create({
      data: {
        profileId: fromProfileId,
        type: TransactionType.TRANSFER,
        amount: -amount,
        balanceAfter: fromNewBalance,
        note: note ?? "Transfer sent",
      },
    });

    const to = await tx.economyProfile.findUniqueOrThrow({ where: { id: toProfileId } });
    const toNewBalance = to.wallet + amount;
    const updatedTo = await tx.economyProfile.update({
      where: { id: toProfileId },
      data: { wallet: toNewBalance },
    });
    await tx.transaction.create({
      data: {
        profileId: toProfileId,
        type: TransactionType.TRANSFER,
        amount,
        balanceAfter: toNewBalance,
        note: note ?? "Transfer received",
      },
    });

    return { from: updatedFrom, to: updatedTo };
  });
}

export async function publishEconomyTransaction(
  guildId: string,
  discordUserId: string,
  type: TransactionType,
  amount: bigint,
  balanceAfter: bigint,
): Promise<void> {
  await publishRealtimeEvent(RealtimeEvent.EconomyTransaction, guildId, {
    discordUserId,
    type,
    amount: amount.toString(),
    balanceAfter: balanceAfter.toString(),
  });
}

const DAILY_AMOUNT = 250n;
const DAILY_STREAK_BONUS = 25n;
const WEEKLY_AMOUNT = 1000n;
const DAY_MS = 24 * 60 * 60 * 1000;
const WORK_COOLDOWN_MS = 60 * 60 * 1000;

export function canClaimDaily(lastDaily: Date | null): boolean {
  if (!lastDaily) return true;
  return Date.now() - lastDaily.getTime() >= DAY_MS;
}

export function isStreakContinued(lastDaily: Date | null): boolean {
  if (!lastDaily) return false;
  const diff = Date.now() - lastDaily.getTime();
  return diff < DAY_MS * 2;
}

export function computeDailyReward(streak: number): bigint {
  return DAILY_AMOUNT + DAILY_STREAK_BONUS * BigInt(Math.max(0, streak - 1));
}

export function canClaimWeekly(lastWeekly: Date | null): boolean {
  if (!lastWeekly) return true;
  return Date.now() - lastWeekly.getTime() >= DAY_MS * 7;
}

export const WEEKLY_REWARD = WEEKLY_AMOUNT;

export function canWork(lastWork: Date | null): boolean {
  if (!lastWork) return true;
  return Date.now() - lastWork.getTime() >= WORK_COOLDOWN_MS;
}

export const WORK_COOLDOWN_MINUTES = WORK_COOLDOWN_MS / 60_000;

const JOBS: Array<{ title: string; min: number; max: number }> = [
  { title: "delivered packages", min: 50, max: 150 },
  { title: "walked dogs", min: 30, max: 100 },
  { title: "fixed a bug for a client", min: 100, max: 300 },
  { title: "streamed for tips", min: 20, max: 250 },
  { title: "did freelance design work", min: 80, max: 220 },
  { title: "tutored a student", min: 60, max: 180 },
];

export function rollWork(): { title: string; amount: bigint } {
  const job = JOBS[Math.floor(Math.random() * JOBS.length)];
  const amount = BigInt(Math.floor(Math.random() * (job.max - job.min + 1)) + job.min);
  return { title: job.title, amount };
}
