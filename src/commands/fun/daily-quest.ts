import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { DAILY_QUESTS } from "../../services/fun/funData";
import { buildEmbed, errorEmbed } from "../../utils/embed";

/** Deterministic daily quest based on the date so everyone sees the same quest each day. */
function getTodayQuest() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length]!;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("daily-quest")
    .setDescription("Lihat quest harian komunitas."),
  category: "fun",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const quest = getTodayQuest();

    await interaction.reply({
      embeds: [
        buildEmbed("premium")
          .setTitle("📜 Quest Harian")
          .setDescription(`**${quest.description}**\nHadiah: 🪙 ${quest.reward} koin`)
          .setFooter({
            text: "Quest berganti setiap hari. Selesaikan lewat aktivitas normalmu di server!",
          }),
      ],
    });
  },
};

export default command;
