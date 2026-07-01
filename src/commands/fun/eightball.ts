import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { EIGHTBALL_ANSWERS } from "../../services/fun/funData";
import { buildEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Tanya bola ajaib.")
    .addStringOption((option) =>
      option
        .setName("pertanyaan")
        .setDescription("Pertanyaanmu.")
        .setRequired(true)
        .setMaxLength(300),
    ),
  category: "fun",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    const pertanyaan = interaction.options.getString("pertanyaan", true);
    const answer = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)]!;

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🎱 Bola Ajaib")
          .addFields({ name: "Pertanyaan", value: pertanyaan }, { name: "Jawaban", value: answer }),
      ],
    });
  },
};

export default command;
