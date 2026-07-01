import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("embed-builder")
    .setDescription("[Admin] Buat embed custom untuk dikirim ke channel ini.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: "utility",
  requiredPermissions: [PermissionFlagsBits.ManageMessages],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder().setCustomId("embed:build").setTitle("Buat Embed Custom");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("judul")
          .setLabel("Judul")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(false),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("deskripsi")
          .setLabel("Deskripsi")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("warna")
          .setLabel("Warna hex (opsional, mis. #5865F2)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(7)
          .setRequired(false),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("footer")
          .setLabel("Footer (opsional)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2048)
          .setRequired(false),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("gambar")
          .setLabel("URL gambar (opsional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false),
      ),
    );

    await interaction.showModal(modal);
  },
};

export default command;
