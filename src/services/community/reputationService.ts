import { REPUTATION_COOLDOWN_HOURS } from "../../config/constants";
import { getOrCreateMember } from "../profile/profileService";

export interface GiveReputationResult {
  success: boolean;
  reason?: "self" | "cooldown";
  nextGiveInMs?: number;
  newReputation?: number;
}

export async function giveReputation(
  guildId: string,
  giverId: string,
  receiverId: string,
): Promise<GiveReputationResult> {
  if (giverId === receiverId) return { success: false, reason: "self" };

  const giver = await getOrCreateMember(guildId, giverId);
  const now = Date.now();

  if (giver.lastReputationGivenAt) {
    const cooldownExpiresAt =
      giver.lastReputationGivenAt.getTime() + REPUTATION_COOLDOWN_HOURS * 3_600_000;
    if (now < cooldownExpiresAt) {
      return { success: false, reason: "cooldown", nextGiveInMs: cooldownExpiresAt - now };
    }
  }

  giver.lastReputationGivenAt = new Date();
  await giver.save();

  const receiver = await getOrCreateMember(guildId, receiverId);
  receiver.reputation += 1;
  await receiver.save();

  return { success: true, newReputation: receiver.reputation };
}
