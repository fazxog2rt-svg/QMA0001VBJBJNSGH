import { ActivityType } from "discord.js";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"ready"> = {
  name: "ready",
  once: true,
  execute: (client) => {
    logger.info(`Bot login sebagai ${client.user?.tag}`, {
      guilds: client.guilds.cache.size,
    });

    client.user?.setPresence({
      activities: [{ name: "komunitas Indonesia | /help", type: ActivityType.Watching }],
      status: "online",
    });
  },
};

export default event;
