import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { evaluateExpression } from "../../services/utility/safeCalculator";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Kalkulator (mendukung + - * / % ^ dan kurung).")
    .addStringOption((option) =>
      option
        .setName("ekspresi")
        .setDescription("Contoh: (2 + 3) * 4 ^ 2")
        .setRequired(true)
        .setMaxLength(200),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const ekspresi = interaction.options.getString("ekspresi", true);

    try {
      const result = evaluateExpression(ekspresi);
      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle("🧮 Kalkulator")
            .setDescription(`\`${ekspresi}\` = **${result.toLocaleString("id-ID")}**`),
        ],
      });
    } catch (error) {
      await interaction.reply({
        embeds: [errorEmbed(error instanceof Error ? error.message : "Ekspresi tidak valid.")],
        ephemeral: true,
      });
    }
  },
};

export default command;
