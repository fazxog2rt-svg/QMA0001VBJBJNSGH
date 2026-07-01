import type { MessageReaction, PartialMessageReaction } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { StarboardPost } from "../../database/models/StarboardPost";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

function reactionMatchesEmoji(
  reaction: MessageReaction | PartialMessageReaction,
  emoji: string,
): boolean {
  return reaction.emoji.name === emoji || reaction.emoji.toString() === emoji;
}

export async function handleStarboardReactionChange(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<void> {
  const guild = reaction.message.guild;
  if (!guild) return;

  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig?.starboard?.enabled || !guildConfig.starboard.channelId) return;
  if (!reactionMatchesEmoji(reaction, guildConfig.starboard.emoji)) return;

  const message = reaction.partial
    ? await reaction.message.fetch().catch(() => null)
    : reaction.message;
  if (!message?.author) return;
  if (message.author.bot) return;

  const starCount = reaction.count ?? 0;
  const starboardChannel = guild.channels.cache.get(guildConfig.starboard.channelId);
  if (!starboardChannel?.isTextBased()) return;

  const existingPost = await StarboardPost.findOne({ originalMessageId: message.id });

  if (starCount < guildConfig.starboard.threshold) {
    if (existingPost) {
      const starboardMessage = await starboardChannel.messages
        .fetch(existingPost.starboardMessageId)
        .catch(() => null);
      await starboardMessage?.delete().catch(() => undefined);
      await StarboardPost.deleteOne({ _id: existingPost._id });
    }
    return;
  }

  const embed = buildEmbed("premium")
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(message.content || "_(tidak ada teks)_")
    .addFields({ name: "Sumber", value: `[Lompat ke pesan](${message.url})` })
    .setFooter({ text: `${guildConfig.starboard.emoji} ${starCount}` });

  const firstImage = message.attachments.find((attachment) =>
    attachment.contentType?.startsWith("image/"),
  );
  if (firstImage) embed.setImage(firstImage.url);

  try {
    if (existingPost) {
      const starboardMessage = await starboardChannel.messages
        .fetch(existingPost.starboardMessageId)
        .catch(() => null);
      if (starboardMessage) {
        await starboardMessage.edit({ embeds: [embed] });
        existingPost.starCount = starCount;
        await existingPost.save();
        return;
      }
    }

    const sentMessage = await starboardChannel.send({
      content: `${guildConfig.starboard.emoji} **${starCount}** • <#${message.channelId}>`,
      embeds: [embed],
    });

    await StarboardPost.create({
      guildId: guild.id,
      originalMessageId: message.id,
      originalChannelId: message.channelId,
      starboardMessageId: sentMessage.id,
      starCount,
      authorId: message.author.id,
    });
  } catch (error) {
    logger.error("Gagal memproses starboard", {
      error: error instanceof Error ? error.message : error,
    });
  }
}
