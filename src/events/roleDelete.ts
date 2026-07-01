import { AuditLogEvent, type Role } from "discord.js";
import { trackDestructiveAction } from "../services/security/antiNukeService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"roleDelete"> = {
  name: "roleDelete",
  execute: async (_client, role: Role) => {
    try {
      const auditLogs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1,
      });
      const entry = auditLogs.entries.first();
      if (!entry?.executor) return;

      await trackDestructiveAction(role.guild, entry.executor.id, "hapus role");
    } catch (error) {
      logger.error("Gagal memproses roleDelete untuk anti-nuke", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
