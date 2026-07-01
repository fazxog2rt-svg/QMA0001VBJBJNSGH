/**
 * Example plugin proving the NexusPlugin extensibility pattern end-to-end.
 *
 * This plugin is intentionally NOT a duplicate of the core birthday feature
 * (src/features/engagement/birthdays.ts, wired into the hourly cron in
 * ready.ts). Instead it demonstrates a *second*, independent hook point: a
 * lightweight `/birthday-countdown` command plus a cron job that runs
 * entirely from plugin code, registered via onLoad, without editing any core
 * file. Real future feature packs (music, casino games, fishing economy,
 * marketplaces, pet battling, etc.) should follow this exact shape:
 *   - define commands/events as plain Command/EventModule objects
 *   - do any recurring work by scheduling your own cron/interval in onLoad
 *   - talk to the database and Redis exactly like core code does
 */
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import cron from "node-cron";
import { prisma } from "@nexusbot/database";
import type { NexusPlugin } from "../../types/plugin";
import type { Command } from "../../types/command";
import { childLogger } from "../../lib/logger";

const log = childLogger("plugin:example-birthday-announcer");

const birthdayCountdownCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("birthday-countdown")
    .setDescription("[Plugin] Shows how many days until your registered birthday") as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;

    const birthday = await prisma.birthday.findUnique({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } },
    });

    if (!birthday) {
      await interaction.reply({
        content: "You haven't set a birthday yet. Use `/birthday` first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const now = new Date();
    let next = new Date(Date.UTC(now.getUTCFullYear(), birthday.month - 1, birthday.day));
    if (next.getTime() < now.getTime()) {
      next = new Date(Date.UTC(now.getUTCFullYear() + 1, birthday.month - 1, birthday.day));
    }
    const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86_400_000);

    await interaction.reply({
      content: daysUntil === 0 ? "Your birthday is today! Happy birthday!" : `Your birthday is in **${daysUntil}** day(s).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

const plugin: NexusPlugin = {
  key: "example-birthday-announcer",
  name: "Example: Birthday Countdown",
  description:
    "Reference plugin demonstrating the NexusPlugin extensibility pattern: adds a /birthday-countdown command and a daily cron job that logs upcoming birthdays, without modifying any core file.",
  commands: [birthdayCountdownCommand],

  async onLoad(_client) {
    // Runs once per day at 09:00 UTC: logs how many birthdays are coming up
    // in the next 7 days across all guilds. A real implementation could post
    // this to a configured channel per guild, exactly like the core birthday
    // announcer does, but scoped entirely to this plugin's own logic.
    cron.schedule("0 9 * * *", () => {
      void (async () => {
        try {
          const birthdays = await prisma.birthday.findMany();
          const now = new Date();
          const upcoming = birthdays.filter((b) => {
            let next = new Date(Date.UTC(now.getUTCFullYear(), b.month - 1, b.day));
            if (next.getTime() < now.getTime()) next = new Date(Date.UTC(now.getUTCFullYear() + 1, b.month - 1, b.day));
            const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
            return daysUntil <= 7;
          });
          log.info({ upcomingCount: upcoming.length }, "Daily birthday countdown scan complete");
        } catch (err) {
          log.error({ err }, "Plugin cron job failed");
        }
      })();
    });

    log.info("example-birthday-announcer plugin loaded: /birthday-countdown command + daily cron registered");
  },
};

export default plugin;
