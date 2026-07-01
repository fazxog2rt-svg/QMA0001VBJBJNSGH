import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { createCanvas } from "@napi-rs/canvas";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("color")
    .setDescription("Pratinjau warna dari kode hex.")
    .addStringOption((option) =>
      option.setName("hex").setDescription("Kode hex, mis. #5865F2.").setRequired(true),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const input = interaction.options.getString("hex", true).trim();
    const match = HEX_PATTERN.exec(input);

    if (!match) {
      await interaction.reply({
        embeds: [errorEmbed("Format hex tidak valid. Contoh: `#5865F2`.")],
        ephemeral: true,
      });
      return;
    }

    const hex = `#${match[1]!.toUpperCase()}`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 200, 200);
    const buffer = canvas.toBuffer("image/png");

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setColor(parseInt(match[1]!, 16))
          .setTitle(`🎨 ${hex}`)
          .setDescription(`**RGB:** ${r}, ${g}, ${b}`)
          .setThumbnail("attachment://color.png"),
      ],
      files: [new AttachmentBuilder(buffer, { name: "color.png" })],
    });
  },
};

export default command;
