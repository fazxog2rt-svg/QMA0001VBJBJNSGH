import type { Guild } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { SlidingWindowTracker } from "./slidingWindowTracker";
import { logToSecurityChannel } from "./securityLogService";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

const actionTracker = new SlidingWindowTracker();

export async function trackDestructiveAction(
  guild: Guild,
  executorId: string,
  actionLabel: string,
): Promise<void> {
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig?.security?.antiNuke) return;
  if (executorId === guild.ownerId || executorId === guild.client.user.id) return;

  const windowMs = guildConfig.security.antiNukeWindowSeconds * 1000;
  const count = actionTracker.record(`${guild.id}:${executorId}`, windowMs);
  if (count !== guildConfig.security.antiNukeMaxActions) return;

  try {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return;

    const roleIdsToRemove = member.roles.cache
      .filter((role) => role.id !== guild.id)
      .map((role) => role.id);
    await member.roles
      .remove(roleIdsToRemove, "Anti-nuke: aktivitas mencurigakan terdeteksi")
      .catch(() => undefined);

    await logToSecurityChannel(
      guild,
      buildEmbed("danger")
        .setTitle("🛑 Anti-Nuke Diaktifkan")
        .setDescription(
          `${member} melakukan **${count}x "${actionLabel}"** dalam waktu singkat.\nSemua role member ini telah dicabut sementara untuk mencegah kerusakan lebih lanjut. **Mohon tinjau secara manual.**`,
        ),
    );
  } catch (error) {
    logger.error("Gagal menjalankan respons anti-nuke", {
      error: error instanceof Error ? error.message : error,
    });
  }
}
