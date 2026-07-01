import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../../client";
import { childLogger } from "../../lib/logger";

const log = childLogger("reminders");

/** Finds all unsent reminders whose remindAt has passed and DMs/channel-messages the user. */
export async function processDueReminders(client: NexusClient): Promise<void> {
  const due = await prisma.reminder.findMany({
    where: { sent: false, remindAt: { lte: new Date() } },
    take: 50,
  });

  for (const reminder of due) {
    try {
      const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
      const mention = `<@${reminder.userId}>`;
      const text = `${mention} Reminder: ${reminder.content}`;
      if (channel?.isTextBased() && "send" in channel) {
        await channel.send({ content: text });
      } else {
        const user = await client.users.fetch(reminder.userId).catch(() => null);
        await user?.send(`Reminder: ${reminder.content}`).catch(() => undefined);
      }
    } catch (err) {
      log.error({ err, reminderId: reminder.id }, "Failed to deliver reminder");
    } finally {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent: true } });
    }
  }
}
