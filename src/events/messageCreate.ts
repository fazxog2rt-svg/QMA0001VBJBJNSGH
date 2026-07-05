import type { Message } from "discord.js";
import { awardMessageXp, handleLevelUpSideEffects } from "../services/leveling/levelingService";
import { clearAfkIfNeeded, getAfkMentionInfo } from "../services/community/afkService";
import { handleAiChannelMessage } from "../services/ai/aiChannelService";
import { runAutoMod } from "../services/security/autoModService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

async function handleAfk(message: Message<true>): Promise<void> {
  const cleared = await clearAfkIfNeeded(message.guildId, message.author.id);
  if (cleared.wasAfk) {
    await message
      .reply({ content: `👋 Selamat datang kembali, ${message.author}! AFK-mu telah dihapus.` })
      .catch(() => undefined);
  }

  const mentionedUserIds = message.mentions.users
    .filter((user) => !user.bot)
    .map((user) => user.id);
  if (mentionedUserIds.length === 0) return;

  const afkMentions = await getAfkMentionInfo(message.guildId, mentionedUserIds);
  if (afkMentions.length === 0) return;

  const lines = afkMentions.map(
    (info) =>
      `<@${info.userId}> sedang AFK: ${info.reason} (<t:${Math.floor(info.since.getTime() / 1000)}:R>)`,
  );
  await message.reply({ content: lines.join("\n") }).catch(() => undefined);
}

const event: BotEvent<"messageCreate"> = {
  name: "messageCreate",
  execute: async (_client, message: Message) => {
    if (message.author.bot || !message.inGuild()) return;

    try {
      const wasRemoved = await runAutoMod(message);
      if (wasRemoved) return;

      // Auto-reply AI: kalau channel ini terdaftar, balas otomatis lalu tetap
      // lanjut memberi XP (tidak return supaya chat di channel AI tetap dapat XP).
      await handleAiChannelMessage(message).catch((error: unknown) => {
        logger.error("Gagal auto-reply AI channel", {
          error: error instanceof Error ? error.message : error,
        });
      });

      await handleAfk(message);

      const result = await awardMessageXp(message.guildId, message.author.id);
      if (!result?.leveledUp) return;

      const discordMember =
        message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
      if (!discordMember) return;

      await handleLevelUpSideEffects(message.guild, discordMember, result);
    } catch (error) {
      logger.error("Gagal memproses pesan", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
