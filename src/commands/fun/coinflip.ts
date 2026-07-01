import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Lempar koin: kepala atau ekor?"),
  category: "fun",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    const result = Math.random() < 0.5 ? "Kepala 🙂" : "Ekor 🪙";
    await interaction.reply({
      embeds: [
        buildEmbed("primary").setTitle("🪙 Coinflip").setDescription(`Hasilnya: **${result}**`),
      ],
    });
  },
};

export default command;
