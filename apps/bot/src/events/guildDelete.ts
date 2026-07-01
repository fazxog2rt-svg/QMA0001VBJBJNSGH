import { Events, type Guild } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("guildDelete");

export default {
  name: Events.GuildDelete,
  async execute(_client: NexusClient, guild: Guild) {
    await prisma.guild
      .update({ where: { id: guild.id }, data: { leftAt: new Date() } })
      .catch(() => undefined);

    await publishRealtimeEvent(RealtimeEvent.GuildUpdate, guild.id, { type: "removed", name: guild.name });

    log.info({ guildId: guild.id }, "Left guild");
  },
} satisfies EventModule<Events.GuildDelete>;
