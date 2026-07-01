import cron from "node-cron";
import type { BotClient } from "../../client";
import { Reminder } from "../../database/models/Reminder";
import { Birthday } from "../../database/models/Birthday";
import { GuildConfig } from "../../database/models/GuildConfig";
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

export function startScheduler(client: BotClient): void {
  cron.schedule("* * * * *", () => {
    processDueReminders(client).catch((error) => {
      logger.error("Gagal memproses reminder terjadwal", {
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

  logger.info("Cron scheduler dimulai (reminder setiap menit, ulang tahun setiap jam 08:00 WIB).");
}
