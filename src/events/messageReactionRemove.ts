import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleStarboardReactionChange } from "../services/community/starboardService";
import { handleReactionRoleRemove } from "../services/community/reactionRoleService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"messageReactionRemove"> = {
  name: "messageReactionRemove",
  execute: async (
    _client,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) => {
    try {
      await Promise.all([
        handleStarboardReactionChange(reaction),
        handleReactionRoleRemove(reaction, user),
      ]);
    } catch (error) {
      logger.error("Gagal memproses reaksi dihapus", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
