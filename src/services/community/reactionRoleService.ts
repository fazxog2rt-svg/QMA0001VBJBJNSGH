import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { ReactionRole } from "../../database/models/ReactionRole";
import { logger } from "../../services/logger.service";

function emojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  return reaction.emoji.id ?? reaction.emoji.name ?? reaction.emoji.toString();
}

export async function handleReactionRoleAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  const guild = reaction.message.guild;
  if (!guild || user.bot) return;

  const mapping = await ReactionRole.findOne({
    messageId: reaction.message.id,
    emoji: emojiKey(reaction),
  });
  if (!mapping) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.add(mapping.roleId, "Reaction role").catch((error) => {
    logger.warn("Gagal memberikan reaction role", {
      error: error instanceof Error ? error.message : error,
    });
  });
}

export async function handleReactionRoleRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  const guild = reaction.message.guild;
  if (!guild || user.bot) return;

  const mapping = await ReactionRole.findOne({
    messageId: reaction.message.id,
    emoji: emojiKey(reaction),
  });
  if (!mapping) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.remove(mapping.roleId, "Reaction role dihapus").catch((error) => {
    logger.warn("Gagal menghapus reaction role", {
      error: error instanceof Error ? error.message : error,
    });
  });
}
