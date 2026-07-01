import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleStarboardReactionChange } from "../services/community/starboardService";
import { handleReactionRoleAdd } from "../services/community/reactionRoleService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"messageReactionAdd"> = {
  name: "messageReactionAdd",
  execute: async (
    _client,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) => {
    try {
      await Promise.all([
        handleStarboardReactionChange(reaction),
        handleReactionRoleAdd(reaction, user),
      ]);
    } catch (error) {
      logger.error("Gagal memproses reaksi ditambahkan", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
