import { AttachmentBuilder, type GuildMember } from "discord.js";
import { GuildConfig } from "../database/models/GuildConfig";
import { renderWelcomeCard } from "../services/community/welcomeCardRenderer";
import { checkAntiRaid } from "../services/security/antiRaidService";
import { runJoinSecurityChecks } from "../services/security/verificationService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

function applyTemplate(template: string, member: GuildMember): string {
  return template
    .replaceAll("{user}", `${member}`)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{memberCount}", String(member.guild.memberCount));
}

const event: BotEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  execute: async (_client, member: GuildMember) => {
    await checkAntiRaid(member).catch((error) => {
      logger.error("Gagal memproses anti-raid", {
        error: error instanceof Error ? error.message : error,
      });
    });
    await runJoinSecurityChecks(member).catch((error) => {
      logger.error("Gagal memproses pemeriksaan keamanan join", {
        error: error instanceof Error ? error.message : error,
      });
    });

    try {
      const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });

      if (guildConfig?.autoRoleIds && guildConfig.autoRoleIds.length > 0) {
        await member.roles.add(guildConfig.autoRoleIds).catch((error) => {
          logger.warn("Gagal menambahkan auto role", {
            error: error instanceof Error ? error.message : error,
          });
        });
      }

      if (!guildConfig?.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
      if (!channel?.isTextBased()) return;

      const cardBuffer = await renderWelcomeCard({
        kind: "welcome",
        username: member.user.tag,
        avatarUrl: member.user.displayAvatarURL({ size: 256, extension: "png" }),
        memberCount: member.guild.memberCount,
        guildName: member.guild.name,
      });

      await channel.send({
        content: applyTemplate(guildConfig.welcomeMessage, member),
        files: [new AttachmentBuilder(cardBuffer, { name: "welcome.png" })],
      });
    } catch (error) {
      logger.error("Gagal memproses guildMemberAdd", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
