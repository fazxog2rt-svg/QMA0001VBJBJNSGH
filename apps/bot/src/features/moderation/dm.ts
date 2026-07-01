import type { User } from "discord.js";
import { childLogger } from "../../lib/logger";

const log = childLogger("moderation-dm");

/** Best-effort DM to the target describing the moderation action. Never throws. */
export async function tryDmTarget(
  target: User,
  guildName: string,
  action: string,
  reason?: string | null,
  duration?: string | null,
): Promise<boolean> {
  try {
    const lines = [`You have received a **${action}** in **${guildName}**.`];
    if (reason) lines.push(`Reason: ${reason}`);
    if (duration) lines.push(`Duration: ${duration}`);
    await target.send({ content: lines.join("\n") });
    return true;
  } catch (err) {
    log.debug({ err, targetId: target.id }, "Could not DM target (likely DMs closed)");
    return false;
  }
}
