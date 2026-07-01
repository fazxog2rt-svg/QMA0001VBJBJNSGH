import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import QRCode from "qrcode";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("qr")
    .setDescription("Buat QR code dari teks atau link.")
    .addStringOption((option) =>
      option
        .setName("teks")
        .setDescription("Teks/URL yang di-encode.")
        .setRequired(true)
        .setMaxLength(1000),
    ),
  category: "utility",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    const teks = interaction.options.getString("teks", true);
    await interaction.deferReply();

    try {
      const buffer = await QRCode.toBuffer(teks, { type: "png", scale: 8, margin: 2 });
      const attachment = new AttachmentBuilder(buffer, { name: "qrcode.png" });

      await interaction.editReply({
        embeds: [buildEmbed("primary").setTitle("📱 QR Code").setImage("attachment://qrcode.png")],
        files: [attachment],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Gagal membuat QR code.")] });
    }
  },
};

export default command;
