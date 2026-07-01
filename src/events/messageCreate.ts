import type { Message } from "discord.js";
import { awardMessageXp, handleLevelUpSideEffects } from "../services/leveling/levelingService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"messageCreate"> = {
  name: "messageCreate",
  execute: async (_client, message: Message) => {
    if (message.author.bot || !message.inGuild()) return;

    try {
      const result = await awardMessageXp(message.guildId, message.author.id);
      if (!result?.leveledUp) return;

      const discordMember =
        message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
      if (!discordMember) return;

      await handleLevelUpSideEffects(message.guild, discordMember, result);
    } catch (error) {
      logger.error("Gagal memproses XP pesan", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
