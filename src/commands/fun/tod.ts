import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { DARE_CHALLENGES, TRUTH_QUESTIONS, WOULD_YOU_RATHER } from "../../services/fun/funData";
import { buildEmbed } from "../../utils/embed";

function pick<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tod")
    .setDescription("Truth, Dare, atau Would You Rather.")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Pilih mode.")
        .setRequired(true)
        .addChoices(
          { name: "Truth", value: "truth" },
          { name: "Dare", value: "dare" },
          { name: "Would You Rather", value: "wyr" },
        ),
    ),
  category: "fun",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    const mode = interaction.options.getString("mode", true);

    if (mode === "truth") {
      await interaction.reply({
        embeds: [buildEmbed("primary").setTitle("💬 Truth").setDescription(pick(TRUTH_QUESTIONS))],
      });
      return;
    }

    if (mode === "dare") {
      await interaction.reply({
        embeds: [buildEmbed("warning").setTitle("🔥 Dare").setDescription(pick(DARE_CHALLENGES))],
      });
      return;
    }

    const [optionA, optionB] = pick(WOULD_YOU_RATHER);
    await interaction.reply({
      embeds: [
        buildEmbed("info")
          .setTitle("🤔 Would You Rather")
          .setDescription(`🅰️ ${optionA}\n\n**ATAU**\n\n🅱️ ${optionB}`),
      ],
    });
  },
};

export default command;
