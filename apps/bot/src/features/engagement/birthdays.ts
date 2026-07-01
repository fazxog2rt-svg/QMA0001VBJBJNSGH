import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../../client";
import { childLogger } from "../../lib/logger";

const log = childLogger("birthdays");

// In-memory guard against re-announcing the same birthday twice within one
// process's uptime on the same UTC day (the cron runs hourly).
const announcedToday = new Set<string>();
let lastResetDay = new Date().getUTCDate();

/** Announces birthdays that match today's UTC month/day in each guild's configured channel. */
export async function processDueBirthdays(client: NexusClient): Promise<void> {
  const now = new Date();
  if (now.getUTCDate() !== lastResetDay) {
    announcedToday.clear();
    lastResetDay = now.getUTCDate();
  }

  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();

  const birthdays = await prisma.birthday.findMany({ where: { month, day } });
  if (birthdays.length === 0) return;

  const byGuild = new Map<string, string[]>();
  for (const bday of birthdays) {
    const key = `${bday.guildId}:${bday.userId}`;
    if (announcedToday.has(key)) continue;
    announcedToday.add(key);
    const list = byGuild.get(bday.guildId) ?? [];
    list.push(bday.userId);
    byGuild.set(bday.guildId, list);
  }

  for (const [guildId, userIds] of byGuild) {
    try {
      const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
      const channelId = settings?.welcomeChannelId; // reuse welcome channel as a sane default announce target
      if (!channelId) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased() || !("send" in channel)) continue;

      const mentions = userIds.map((id) => `<@${id}>`).join(", ");
      await channel.send({ content: `🎂 Happy Birthday to ${mentions}! Have a great day!` });
    } catch (err) {
      log.error({ err, guildId }, "Failed to announce birthdays");
    }
  }
}
