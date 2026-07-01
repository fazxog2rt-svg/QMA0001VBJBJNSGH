import { Events, type Invite } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { childLogger } from "../lib/logger";

const log = childLogger("inviteDelete");

export default {
  name: Events.InviteDelete,
  async execute(client: NexusClient, invite: Invite) {
    if (!invite.guild) return;

    await prisma.inviteRecord
      .deleteMany({ where: { guildId: invite.guild.id, code: invite.code } })
      .catch((err) => log.error({ err }, "Failed to remove invite record"));

    client.inviteCache.get(invite.guild.id)?.delete(invite.code);
  },
} satisfies EventModule<Events.InviteDelete>;
