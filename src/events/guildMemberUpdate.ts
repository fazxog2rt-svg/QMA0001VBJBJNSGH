import type { GuildMember, PartialGuildMember } from "discord.js";
import { GuildConfig } from "../database/models/GuildConfig";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

const event: BotEvent<"guildMemberUpdate"> = {
  name: "guildMemberUpdate",
  execute: async (_client, oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    if (oldMember.nickname === newMember.nickname) return;
    if (!newMember.nickname) return;

    try {
      const guildConfig = await GuildConfig.findOne({ guildId: newMember.guild.id });
      const bannedWords = guildConfig?.moderation?.nicknameFilterWords ?? [];
      if (bannedWords.length === 0) return;

      const nicknameLower = newMember.nickname.toLowerCase();
      const hasBannedWord = bannedWords.some((word) => nicknameLower.includes(word));

      if (hasBannedWord && newMember.manageable) {
        await newMember.setNickname(null, "Nickname mengandung kata terlarang");
      }
    } catch (error) {
      logger.error("Gagal memproses filter nickname", {
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

export default event;
