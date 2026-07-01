import { randomInt } from "node:crypto";
import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("password")
    .setDescription("Buat password acak yang kuat (dikirim ephemeral).")
    .addIntegerOption((option) =>
      option
        .setName("panjang")
        .setDescription("Panjang password (8-64, default 16).")
        .setMinValue(8)
        .setMaxValue(64),
    )
    .addBooleanOption((option) =>
      option.setName("simbol").setDescription("Sertakan simbol? (default ya)."),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const length = interaction.options.getInteger("panjang") ?? 16;
    const useSymbols = interaction.options.getBoolean("simbol") ?? true;

    const charset = LOWER + UPPER + DIGITS + (useSymbols ? SYMBOLS : "");
    let password = "";
    for (let i = 0; i < length; i += 1) {
      password += charset[randomInt(0, charset.length)];
    }

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🔑 Password Acak")
          .setDescription(`\`\`\`${password}\`\`\``)
          .setFooter({ text: "Hanya kamu yang bisa melihat pesan ini." }),
      ],
      ephemeral: true,
    });
  },
};

export default command;
