import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getCurrencySymbol, getEconomyLeaderboard } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rich")
    .setDescription("Papan peringkat member terkaya (wallet + bank)."),
  category: "economy",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const entries = await getEconomyLeaderboard(interaction.guildId, 10);
    if (entries.length === 0 || entries.every((entry) => entry.total === 0)) {
      await interaction.editReply({
        embeds: [errorEmbed("Belum ada member dengan saldo di server ini.")],
      });
      return;
    }

    const symbol = await getCurrencySymbol(interaction.guildId);
    const lines = entries.map((entry) => {
      const medal =
        entry.rank === 1
          ? "🥇"
          : entry.rank === 2
            ? "🥈"
            : entry.rank === 3
              ? "🥉"
              : `#${entry.rank}`;
      return `${medal} <@${entry.userId}> — ${symbol} ${entry.total.toLocaleString("id-ID")}`;
    });

    await interaction.editReply({
      embeds: [
        buildEmbed("premium").setTitle("💰 Member Terkaya").setDescription(lines.join("\n")),
      ],
    });
  },
};

export default command;
