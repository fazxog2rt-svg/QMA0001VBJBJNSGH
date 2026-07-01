import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const MAX_OUTPUT = 3900;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("json-format")
    .setDescription("Format & validasi JSON.")
    .addStringOption((option) =>
      option
        .setName("json")
        .setDescription("String JSON yang diformat.")
        .setRequired(true)
        .setMaxLength(1500),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const raw = interaction.options.getString("json", true);

    try {
      const parsed = JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      const output =
        formatted.length > MAX_OUTPUT
          ? `${formatted.slice(0, MAX_OUTPUT)}\n... (terpotong)`
          : formatted;

      await interaction.reply({
        embeds: [
          buildEmbed("success")
            .setTitle("✅ JSON Valid")
            .setDescription(`\`\`\`json\n${output}\n\`\`\``),
        ],
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            `JSON tidak valid: ${error instanceof Error ? error.message : "kesalahan parsing"}`,
          ),
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
