import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("guildMemberRemove");

function applyTemplate(template: string, member: GuildMember | PartialGuildMember): string {
  return template
    .replace(/\{user\}/g, member.user.username)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{memberCount\}/g, String(member.guild.memberCount));
}

export default {
  name: Events.GuildMemberRemove,
  async execute(_client: NexusClient, member: GuildMember | PartialGuildMember) {
    await prisma.guildMember
      .update({
        where: { guildId_discordUserId: { guildId: member.guild.id, discordUserId: member.id } },
        data: { leftAt: new Date() },
      })
      .catch(() => undefined);

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: member.guild.id } });

    if (settings?.goodbyeChannelId) {
      try {
        const channel = await member.guild.channels.fetch(settings.goodbyeChannelId);
        if (channel?.isTextBased()) {
          const message = settings.goodbyeMessage
            ? applyTemplate(settings.goodbyeMessage, member)
            : `${member.user.username} has left **${member.guild.name}**.`;
          await channel.send({ content: message });
        }
      } catch (err) {
        log.error({ err }, "Failed to send goodbye message");
      }
    }

    await publishRealtimeEvent(RealtimeEvent.MemberLeave, member.guild.id, {
      discordUserId: member.id,
      username: member.user.username,
      memberCount: member.guild.memberCount,
    });
  },
} satisfies EventModule<Events.GuildMemberRemove>;
