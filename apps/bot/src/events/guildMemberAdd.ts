import { Events, type GuildMember } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("guildMemberAdd");

function applyTemplate(template: string, member: GuildMember): string {
  return template
    .replace(/\{user\}/g, `${member}`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{memberCount\}/g, String(member.guild.memberCount));
}

export default {
  name: Events.GuildMemberAdd,
  async execute(_client: NexusClient, member: GuildMember) {
    await prisma.guildMember.upsert({
      where: { guildId_discordUserId: { guildId: member.guild.id, discordUserId: member.id } },
      update: { username: member.user.username, avatarUrl: member.user.displayAvatarURL(), leftAt: null, isBot: member.user.bot },
      create: {
        guildId: member.guild.id,
        discordUserId: member.id,
        username: member.user.username,
        avatarUrl: member.user.displayAvatarURL(),
        isBot: member.user.bot,
      },
    });

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: member.guild.id } });

    if (settings?.autoRoleIds?.length) {
      for (const roleId of settings.autoRoleIds) {
        await member.roles.add(roleId).catch((err) => log.warn({ err, roleId }, "Failed to apply auto-role"));
      }
    }

    if (settings?.welcomeChannelId) {
      try {
        const channel = await member.guild.channels.fetch(settings.welcomeChannelId);
        if (channel?.isTextBased()) {
          const message = settings.welcomeMessage
            ? applyTemplate(settings.welcomeMessage, member)
            : `Welcome to **${member.guild.name}**, ${member}! We're glad you're here.`;
          await channel.send({ content: message });
        }
      } catch (err) {
        log.error({ err }, "Failed to send welcome message");
      }
    }

    await publishRealtimeEvent(RealtimeEvent.MemberJoin, member.guild.id, {
      discordUserId: member.id,
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL(),
      memberCount: member.guild.memberCount,
    });
  },
} satisfies EventModule<Events.GuildMemberAdd>;
