import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Lempar dadu.")
    .addIntegerOption((option) =>
      option
        .setName("sisi")
        .setDescription("Jumlah sisi dadu (default 6).")
        .setMinValue(2)
        .setMaxValue(1000),
    )
    .addIntegerOption((option) =>
      option
        .setName("jumlah")
        .setDescription("Jumlah dadu (default 1, maks 10).")
        .setMinValue(1)
        .setMaxValue(10),
    ),
  category: "fun",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    const sides = interaction.options.getInteger("sisi") ?? 6;
    const count = interaction.options.getInteger("jumlah") ?? 1;

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0);

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🎲 Lempar Dadu")
          .setDescription(
            `Hasil (d${sides} ×${count}): ${rolls.join(", ")}${count > 1 ? `\n**Total: ${total}**` : ""}`,
          ),
      ],
    });
  },
};

export default command;
