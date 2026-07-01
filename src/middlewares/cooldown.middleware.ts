import { Collection } from "discord.js";
import type { BotClient } from "../client";

const DEFAULT_COOLDOWN_SECONDS = 3;

/** Returns remaining seconds if user is on cooldown, otherwise records usage and returns 0. */
export function checkCooldown(
  client: BotClient,
  commandName: string,
  userId: string,
  cooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
): number {
  if (!client.cooldowns.has(commandName)) {
    client.cooldowns.set(commandName, new Collection());
  }

  const timestamps = client.cooldowns.get(commandName)!;
  const cooldownMs = cooldownSeconds * 1000;
  const now = Date.now();

  const expiresAt = timestamps.get(userId);
  if (expiresAt && now < expiresAt) {
    return Math.ceil((expiresAt - now) / 1000);
  }

  timestamps.set(userId, now + cooldownMs);
  setTimeout(() => timestamps.delete(userId), cooldownMs).unref();
  return 0;
}
