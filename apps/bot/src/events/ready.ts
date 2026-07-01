import os from "node:os";
import { ActivityType, Events } from "discord.js";
import cron from "node-cron";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent, type BotStatsPayload } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";
import { processDueReminders } from "../features/engagement/reminders";
import { processDueBirthdays } from "../features/engagement/birthdays";
import { processDueGiveaways } from "../features/engagement/giveaways";

const log = childLogger("ready");

let statsIntervalStarted = false;
let cronStarted = false;

function startStatsPublisher(client: NexusClient) {
  if (statsIntervalStarted) return;
  statsIntervalStarted = true;

  setInterval(() => {
    void publishBotStats(client);
  }, 60_000);

  // Publish once immediately on boot.
  void publishBotStats(client);
}

async function publishBotStats(client: NexusClient): Promise<void> {
  try {
    const guildCount = client.guilds.cache.size;
    let userCount = 0;
    for (const guild of client.guilds.cache.values()) {
      userCount += guild.memberCount ?? 0;
    }

    const mem = process.memoryUsage();
    const load = os.loadavg();
    const cpuPercent = Math.min(100, Math.round((load[0] / os.cpus().length) * 100));

    const payload: BotStatsPayload = {
      guildCount,
      userCount,
      ping: Math.round(client.ws.ping),
      cpuPercent,
      ramUsedMb: Math.round(mem.rss / 1024 / 1024),
      ramTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      shardCount: client.shard?.count ?? 1,
      commandsExecuted: client.commandsExecuted,
    };

    // bot.stats is a platform-wide signal, not scoped to one guild; publish
    // under a sentinel guildId of "global" so apps/api can route it to the
    // admin room instead of a per-guild room.
    await publishRealtimeEvent(RealtimeEvent.BotStats, "global", payload);
  } catch (err) {
    log.error({ err }, "Failed to publish bot stats");
  }
}

function startCronJobs(client: NexusClient) {
  if (cronStarted) return;
  cronStarted = true;

  // Every minute: reminders, birthdays (checked once/day at local midnight
  // handling is approximated by checking every minute against stored month/day).
  cron.schedule("* * * * *", () => {
    void processDueReminders(client).catch((err) => log.error({ err }, "processDueReminders failed"));
    void processDueGiveaways(client).catch((err) => log.error({ err }, "processDueGiveaways failed"));
  });

  // Once per hour at minute 0: birthday announcements (avoids re-announcing
  // repeatedly within the same day across restarts within an hour boundary).
  cron.schedule("0 * * * *", () => {
    void processDueBirthdays(client).catch((err) => log.error({ err }, "processDueBirthdays failed"));
  });

  log.info("Cron jobs started (reminders, giveaways every minute; birthdays hourly)");
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: NexusClient) {
    log.info({ tag: client.user?.tag, guilds: client.guilds.cache.size }, "Bot logged in");

    client.user?.setPresence({
      activities: [{ name: "/help | nexusbot.io", type: ActivityType.Watching }],
      status: "online",
    });

    // Backfill Guild rows for any guilds the bot is already in but that
    // aren't yet represented in the database (e.g. after a fresh deploy).
    for (const guild of client.guilds.cache.values()) {
      await prisma.guild
        .upsert({
          where: { id: guild.id },
          update: { name: guild.name, iconUrl: guild.iconURL(), memberCount: guild.memberCount, leftAt: null },
          create: {
            id: guild.id,
            name: guild.name,
            iconUrl: guild.iconURL(),
            ownerId: guild.ownerId,
            memberCount: guild.memberCount,
          },
        })
        .catch((err) => log.error({ err, guildId: guild.id }, "Failed to upsert guild on ready"));

      await prisma.guildSettings
        .upsert({
          where: { guildId: guild.id },
          update: {},
          create: { guildId: guild.id },
        })
        .catch(() => undefined);
    }

    startStatsPublisher(client);
    startCronJobs(client);
  },
} satisfies EventModule<Events.ClientReady>;
