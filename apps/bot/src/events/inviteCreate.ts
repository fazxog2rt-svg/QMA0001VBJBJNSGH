import { Events, type Invite } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { childLogger } from "../lib/logger";

const log = childLogger("inviteCreate");

export default {
  name: Events.InviteCreate,
  async execute(client: NexusClient, invite: Invite) {
    if (!invite.guild) return;

    await prisma.inviteRecord
      .upsert({
        where: { guildId_code: { guildId: invite.guild.id, code: invite.code } },
        update: { uses: invite.uses ?? 0 },
        create: {
          guildId: invite.guild.id,
          code: invite.code,
          inviterId: invite.inviterId ?? "unknown",
          uses: invite.uses ?? 0,
        },
      })
      .catch((err) => log.error({ err }, "Failed to upsert invite record"));

    const cache = client.inviteCache.get(invite.guild.id) ?? new Map();
    cache.set(invite.code, { code: invite.code, uses: invite.uses ?? 0, inviterId: invite.inviterId ?? null });
    client.inviteCache.set(invite.guild.id, cache);
  },
} satisfies EventModule<Events.InviteCreate>;
