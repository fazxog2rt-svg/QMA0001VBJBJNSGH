import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../../client";
import { publishRealtimeEvent } from "../../lib/redis";
import { childLogger } from "../../lib/logger";

const log = childLogger("giveaways");

function pickWinners(entries: string[], count: number): string[] {
  const pool = [...entries];
  const winners: string[] = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

/** Ends any giveaways whose endsAt has passed, picks winners, and announces them. */
export async function processDueGiveaways(client: NexusClient): Promise<void> {
  const due = await prisma.giveaway.findMany({
    where: { endedAt: null, endsAt: { lte: new Date() } },
    include: { entries: true },
    take: 25,
  });

  for (const giveaway of due) {
    try {
      const entrantIds = giveaway.entries.map((e) => e.userId);
      const winners = pickWinners(entrantIds, giveaway.winnerCount);

      await prisma.giveaway.update({ where: { id: giveaway.id }, data: { endedAt: new Date() } });

      const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const text =
          winners.length > 0
            ? `The giveaway for **${giveaway.prize}** has ended! Congratulations ${winners
                .map((id) => `<@${id}>`)
                .join(", ")}!`
            : `The giveaway for **${giveaway.prize}** has ended, but nobody entered.`;
        await channel.send({ content: text });
      }

      await publishRealtimeEvent(RealtimeEvent.GiveawayEnded, giveaway.guildId, {
        giveawayId: giveaway.id,
        prize: giveaway.prize,
        winners,
      });
    } catch (err) {
      log.error({ err, giveawayId: giveaway.id }, "Failed to end giveaway");
    }
  }
}
