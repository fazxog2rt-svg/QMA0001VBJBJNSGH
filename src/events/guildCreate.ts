import type { Guild } from "discord.js";
import { GuildConfig } from "../database/models";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"guildCreate"> = {
  name: "guildCreate",
  execute: async (_client, guild: Guild) => {
    await GuildConfig.findOneAndUpdate(
      { guildId: guild.id },
      { $setOnInsert: { guildId: guild.id } },
      { upsert: true, new: true },
    );

    logger.info(`Bergabung ke guild baru: ${guild.name} (${guild.id})`);
  },
};

export default event;
