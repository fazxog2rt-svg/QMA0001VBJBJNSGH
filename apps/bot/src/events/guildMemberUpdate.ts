import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { publishRealtimeEvent } from "../lib/redis";
import { childLogger } from "../lib/logger";

const log = childLogger("guildMemberUpdate");

export default {
  name: Events.GuildMemberUpdate,
  async execute(
    _client: NexusClient,
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ) {
    const wasBoosting = oldMember.premiumSince != null;
    const isBoosting = newMember.premiumSince != null;

    if (wasBoosting !== isBoosting) {
      const type = isBoosting ? "boost" : "unboost";
      try {
        await prisma.boostEvent.create({
          data: { guildId: newMember.guild.id, userId: newMember.id, type },
        });

        await publishRealtimeEvent(RealtimeEvent.BoostEvent, newMember.guild.id, {
          discordUserId: newMember.id,
          username: newMember.user.username,
          type,
        });
      } catch (err) {
        log.error({ err }, "Failed to record boost event");
      }
    }

    // Keep cached roles in sync for GuildMember.roles used by leveling/rewards.
    if (oldMember.roles?.cache && newMember.roles.cache) {
      const roleIds = [...newMember.roles.cache.keys()];
      await prisma.guildMember
        .updateMany({
          where: { guildId: newMember.guild.id, discordUserId: newMember.id },
          data: { roles: roleIds, username: newMember.user.username },
        })
        .catch(() => undefined);
    }
  },
} satisfies EventModule<Events.GuildMemberUpdate>;
