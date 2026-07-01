import { randomUUID } from "node:crypto";
import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("uuid")
    .setDescription("Buat UUID v4 acak.")
    .addIntegerOption((option) =>
      option
        .setName("jumlah")
        .setDescription("Jumlah UUID (1-10, default 1).")
        .setMinValue(1)
        .setMaxValue(10),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const jumlah = interaction.options.getInteger("jumlah") ?? 1;
    const uuids = Array.from({ length: jumlah }, () => randomUUID());

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🆔 UUID v4")
          .setDescription(`\`\`\`\n${uuids.join("\n")}\n\`\`\``),
      ],
    });
  },
};

export default command;
