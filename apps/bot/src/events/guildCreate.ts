import { Events, type Guild } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("guildCreate");

export default {
  name: Events.GuildCreate,
  async execute(_client: NexusClient, guild: Guild) {
    await prisma.guild.upsert({
      where: { id: guild.id },
      update: { name: guild.name, iconUrl: guild.iconURL(), ownerId: guild.ownerId, memberCount: guild.memberCount, leftAt: null },
      create: {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL(),
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      },
    });

    await prisma.guildSettings.upsert({
      where: { guildId: guild.id },
      update: {},
      create: { guildId: guild.id },
    });

    await publishRealtimeEvent(RealtimeEvent.GuildUpdate, guild.id, {
      type: "installed",
      name: guild.name,
      memberCount: guild.memberCount,
    });

    log.info({ guildId: guild.id, name: guild.name }, "Joined guild");
  },
} satisfies EventModule<Events.GuildCreate>;
