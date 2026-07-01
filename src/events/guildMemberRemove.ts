import { AttachmentBuilder, type GuildMember, type PartialGuildMember } from "discord.js";
import { GuildConfig } from "../database/models/GuildConfig";
import { renderWelcomeCard } from "../services/community/welcomeCardRenderer";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

function applyTemplate(template: string, member: GuildMember | PartialGuildMember): string {
  return template
    .replaceAll("{user}", member.user.tag)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{memberCount}", String(member.guild.memberCount));
}

const event: BotEvent<"guildMemberRemove"> = {
  name: "guildMemberRemove",
  execute: async (_client, member: GuildMember | PartialGuildMember) => {
    try {
      const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
      if (!guildConfig?.goodbyeChannelId) return;

      const channel = member.guild.channels.cache.get(guildConfig.goodbyeChannelId);
      if (!channel?.isTextBased()) return;

      const cardBuffer = await renderWelcomeCard({
        kind: "goodbye",
        username: member.user.tag,
        avatarUrl: member.user.displayAvatarURL({ size: 256, extension: "png" }),
        memberCount: member.guild.memberCount,
        guildName: member.guild.name,
      });

      await channel.send({
        content: applyTemplate(guildConfig.goodbyeMessage, member),
        files: [new AttachmentBuilder(cardBuffer, { name: "goodbye.png" })],
      });
    } catch (error) {
      logger.error("Gagal memproses guildMemberRemove", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
