import { Events, type Message } from "discord.js";
import { prisma } from "@nexusbot/database";
import {
  RealtimeEvent,
  XP_MESSAGE_COOLDOWN_SECONDS,
  XP_PER_MESSAGE_MIN,
  XP_PER_MESSAGE_MAX,
  levelFromXp,
} from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { runAutoMod } from "../features/automod/orchestrator";
import { childLogger } from "../lib/logger";

const log = childLogger("messageCreate");

// `${guildId}:${userId}` -> ms timestamp of last XP grant, in-memory cooldown.
const xpCooldowns = new Map<string, number>();

function rollXp(): number {
  return Math.floor(Math.random() * (XP_PER_MESSAGE_MAX - XP_PER_MESSAGE_MIN + 1)) + XP_PER_MESSAGE_MIN;
}

async function handleAfkReturn(message: Message, client: NexusClient): Promise<void> {
  const afkKey = `${message.guildId}:${message.author.id}`;
  const entry = client.afkUsers.get(afkKey);
  if (entry) {
    client.afkUsers.delete(afkKey);
    await message.reply({ content: `Welcome back ${message.author}, I've removed your AFK status.` }).catch(() => undefined);
  }

  if (message.mentions.users.size > 0) {
    for (const mentioned of message.mentions.users.values()) {
      const mentionedKey = `${message.guildId}:${mentioned.id}`;
      const mentionedAfk = client.afkUsers.get(mentionedKey);
      if (mentionedAfk) {
        const minutesAgo = Math.floor((Date.now() - mentionedAfk.since.getTime()) / 60_000);
        await message.reply({
          content: `${mentioned.username} is AFK: ${mentionedAfk.reason} (${minutesAgo}m ago)`,
        }).catch(() => undefined);
      }
    }
  }
}

async function handleXpGain(message: Message): Promise<void> {
  const settings = await prisma.guildSettings.findUnique({ where: { guildId: message.guildId! } });
  if (settings && !settings.levelingEnabled) return;

  const cooldownKey = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const lastGrant = xpCooldowns.get(cooldownKey) ?? 0;
  if (now - lastGrant < XP_MESSAGE_COOLDOWN_SECONDS * 1000) return;
  xpCooldowns.set(cooldownKey, now);

  const member = await prisma.guildMember.upsert({
    where: { guildId_discordUserId: { guildId: message.guildId!, discordUserId: message.author.id } },
    update: { username: message.author.username, messageCount: { increment: 1 } },
    create: {
      guildId: message.guildId!,
      discordUserId: message.author.id,
      username: message.author.username,
      messageCount: 1,
    },
  });

  const gainedXp = rollXp();
  const newXp = member.xp + gainedXp;
  const previousLevel = member.level;
  const newLevel = levelFromXp(newXp);

  await prisma.guildMember.update({
    where: { id: member.id },
    data: { xp: newXp, level: newLevel },
  });

  if (newLevel > previousLevel) {
    await publishRealtimeEvent(RealtimeEvent.LevelUp, message.guildId!, {
      discordUserId: message.author.id,
      username: message.author.username,
      previousLevel,
      newLevel,
      xp: newXp,
    });

    // Apply level role rewards for every level threshold crossed (handles multi-level jumps).
    const rewards = await prisma.levelRoleReward.findMany({
      where: { guildId: message.guildId!, level: { gt: previousLevel, lte: newLevel } },
    });

    for (const reward of rewards) {
      await message.member?.roles.add(reward.roleId).catch((err) =>
        log.warn({ err, roleId: reward.roleId }, "Failed to grant level role reward"),
      );
    }

    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      message.channel.send({ content: `${message.author} leveled up to **Level ${newLevel}**!` }).catch(() => undefined);
    }
  }
}

export default {
  name: Events.MessageCreate,
  async execute(client: NexusClient, message: Message) {
    if (message.author.bot || !message.guildId || !message.guild) return;

    await handleAfkReturn(message, client);
    await handleXpGain(message).catch((err) => log.error({ err }, "XP gain handler failed"));

    // AutoMod scan
    try {
      const [settings, rules] = await Promise.all([
        prisma.guildSettings.findUnique({ where: { guildId: message.guildId } }),
        prisma.autoModRule.findMany({ where: { guildId: message.guildId, enabled: true } }),
      ]);
      if (rules.length > 0) {
        await runAutoMod(message, rules, settings);
      }
    } catch (err) {
      log.error({ err }, "AutoMod scan failed");
    }
  },
} satisfies EventModule<Events.MessageCreate>;
