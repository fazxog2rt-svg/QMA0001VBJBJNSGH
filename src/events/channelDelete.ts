import { AuditLogEvent, type DMChannel, type NonThreadGuildBasedChannel } from "discord.js";
import { trackDestructiveAction } from "../services/security/antiNukeService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"channelDelete"> = {
  name: "channelDelete",
  execute: async (_client, channel: DMChannel | NonThreadGuildBasedChannel) => {
    if (!("guild" in channel) || !channel.guild) return;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1,
      });
      const entry = auditLogs.entries.first();
      if (!entry?.executor) return;

      await trackDestructiveAction(channel.guild, entry.executor.id, "hapus channel");
    } catch (error) {
      logger.error("Gagal memproses channelDelete untuk anti-nuke", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
