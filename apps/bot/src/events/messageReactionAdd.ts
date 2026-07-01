import { Events, type MessageReaction, type PartialMessageReaction, type User, type PartialUser } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("messageReactionAdd");

function emojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  return reaction.emoji.id ?? reaction.emoji.name ?? "";
}

export default {
  name: Events.MessageReactionAdd,
  async execute(
    _client: NexusClient,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) {
    if (user.bot) return;
    if (!reaction.message.guildId) return;

    try {
      if (reaction.partial) await reaction.fetch();
    } catch (err) {
      log.warn({ err }, "Failed to fetch partial reaction");
      return;
    }

    const mapping = await prisma.reactionRole.findFirst({
      where: {
        guildId: reaction.message.guildId,
        messageId: reaction.message.id,
        emoji: emojiKey(reaction),
      },
    });
    if (!mapping) return;

    const guild = reaction.message.guild;
    const member = await guild?.members.fetch(user.id).catch(() => null);
    if (!member) return;

    await member.roles.add(mapping.roleId).catch((err) => log.warn({ err }, "Failed to add reaction role"));

    await publishRealtimeEvent(RealtimeEvent.RoleUpdate, reaction.message.guildId, {
      discordUserId: user.id,
      roleId: mapping.roleId,
      action: "added",
      source: "reaction_role",
    });
  },
} satisfies EventModule<Events.MessageReactionAdd>;
