import { EmbedBuilder } from "discord.js";
import type { ModalComponent } from "../../types/component";
import { errorEmbed, successEmbed } from "../../utils/embed";
import { EMBED_COLORS } from "../../config/constants";

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

const component: ModalComponent = {
  customId: "embed:build",
  execute: async (interaction) => {
    if (!interaction.channel?.isTextBased() || !("send" in interaction.channel)) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    const judul = interaction.fields.getTextInputValue("judul").trim();
    const deskripsi = interaction.fields.getTextInputValue("deskripsi").trim();
    const warnaInput = interaction.fields.getTextInputValue("warna").trim();
    const footer = interaction.fields.getTextInputValue("footer").trim();
    const gambar = interaction.fields.getTextInputValue("gambar").trim();

    const embed = new EmbedBuilder().setDescription(deskripsi).setTimestamp();

    const hexMatch = HEX_PATTERN.exec(warnaInput);
    embed.setColor(hexMatch ? parseInt(hexMatch[1]!, 16) : EMBED_COLORS.primary);

    if (judul) embed.setTitle(judul);
    if (footer) embed.setFooter({ text: footer });
    if (gambar && /^https?:\/\//.test(gambar)) embed.setImage(gambar);

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ embeds: [successEmbed("Embed berhasil dikirim!")], ephemeral: true });
  },
};

export default component;
