import cron from "node-cron";
import type { BotClient } from "../../client";
import { Reminder } from "../../database/models/Reminder";
import { Birthday } from "../../database/models/Birthday";
import { GuildConfig } from "../../database/models/GuildConfig";
import { ModerationCase } from "../../database/models/ModerationCase";
import { CommunityEvent } from "../../database/models/CommunityEvent";
import { processDueGiveaways } from "../events/giveawayService";
import { runScheduledMotivations } from "../community/motivationService";
import { runDueTrials } from "../moderation/trialService";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";

async function processDueReminders(client: BotClient): Promise<void> {
  const dueReminders = await Reminder.find({ delivered: false, remindAt: { $lte: new Date() } });

  for (const reminder of dueReminders) {
    try {
      const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        await channel.send({
          content: `⏰ <@${reminder.userId}> Pengingat: ${reminder.message}`,
        });
      }
    } catch (error) {
      logger.warn("Gagal mengirim reminder", {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      reminder.delivered = true;
      await reminder.save();
    }
  }
}

async function announceBirthdays(client: BotClient): Promise<void> {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const birthdays = await Birthday.find({ day, month, lastAnnouncedYear: { $ne: year } });
  if (birthdays.length === 0) return;

  const birthdaysByGuild = new Map<string, typeof birthdays>();
  for (const birthday of birthdays) {
    const list = birthdaysByGuild.get(birthday.guildId) ?? [];
    list.push(birthday);
    birthdaysByGuild.set(birthday.guildId, list);
  }

  for (const [guildId, guildBirthdays] of birthdaysByGuild) {
    const guildConfig = await GuildConfig.findOne({ guildId });
    if (!guildConfig?.birthdayChannelId) continue;

    const channel = await client.channels.fetch(guildConfig.birthdayChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) continue;

    const mentions = guildBirthdays.map((birthday) => `<@${birthday.userId}>`).join(", ");
    await channel
      .send({
        embeds: [
          buildEmbed("premium").setDescription(`🎉🎂 Selamat ulang tahun untuk ${mentions}!`),
        ],
      })
      .catch(() => undefined);

    for (const birthday of guildBirthdays) {
      birthday.lastAnnouncedYear = year;
      await birthday.save();
    }
  }
}

async function processExpiredTempbans(client: BotClient): Promise<void> {
  const expiredCases = await ModerationCase.find({
    type: "tempban",
    active: true,
    expiresAt: { $lte: new Date() },
  });

  for (const moderationCase of expiredCases) {
    try {
      const guild = await client.guilds.fetch(moderationCase.guildId).catch(() => null);
      await guild?.members
        .unban(moderationCase.targetId, "Tempban berakhir otomatis")
        .catch(() => undefined);
    } catch (error) {
      logger.warn("Gagal memproses unban otomatis", {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      moderationCase.active = false;
      await moderationCase.save();
    }
  }
}

async function processDueEventReminders(client: BotClient): Promise<void> {
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const events = await CommunityEvent.find({
    completed: false,
    reminded: false,
    startsAt: { $lte: soon, $gt: new Date() },
  });

  for (const event of events) {
    try {
      const channel = await client.channels.fetch(event.channelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const goingMentions = event.rsvp
          .filter((entry) => entry.status === "going")
          .map((entry) => `<@${entry.userId}>`)
          .join(" ");
        await channel.send({
          content: goingMentions || undefined,
          embeds: [
            buildEmbed("premium").setDescription(
              `⏰ Event **${event.title}** akan dimulai <t:${Math.floor(event.startsAt.getTime() / 1000)}:R>!`,
            ),
          ],
        });
      }
    } catch (error) {
      logger.warn("Gagal mengirim reminder event", {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      event.reminded = true;
      await event.save();
    }
  }
}

export function startScheduler(client: BotClient): void {
  cron.schedule("* * * * *", () => {
    processExpiredTempbans(client).catch((error) => {
      logger.error("Gagal memproses tempban terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
  });

  cron.schedule("* * * * *", () => {
    processDueGiveaways(client).catch((error) => {
      logger.error("Gagal memproses giveaway terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
    processDueEventReminders(client).catch((error) => {
      logger.error("Gagal memproses reminder event terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
  });

  cron.schedule("* * * * *", () => {
    processDueReminders(client).catch((error) => {
      logger.error("Gagal memproses reminder terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
    runScheduledMotivations(client).catch((error) => {
      logger.error("Gagal memproses motivasi terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
    runDueTrials(client).catch((error) => {
      logger.error("Gagal memproses sidang terjadwal", {
        error: error instanceof Error ? error.message : error,
      });
    });
  });

  cron.schedule(
    "0 8 * * *",
    () => {
      announceBirthdays(client).catch((error) => {
        logger.error("Gagal memproses pengumuman ulang tahun", {
          error: error instanceof Error ? error.message : error,
        });
      });
    },
    { timezone: "Asia/Jakarta" },
  );

  logger.info(
    "Cron scheduler dimulai (reminder & tempban setiap menit, ulang tahun setiap jam 08:00 WIB).",
  );
}
