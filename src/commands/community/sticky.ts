import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { StickyMessage } from "../../database/models/StickyMessage";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("[Admin] Pesan yang selalu nempel di bawah channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Pasang sticky message di channel ini.")
        .addStringOption((opt) =>
          opt.setName("teks").setDescription("Isi pesan.").setRequired(true).setMaxLength(1500),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("hapus").setDescription("Hapus sticky message di channel ini."),
    ),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageMessages],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const teks = interaction.options.getString("teks", true);
      await StickyMessage.findOneAndUpdate(
        { guildId: interaction.guildId, channelId: interaction.channelId },
        {
          $set: { content: teks, createdBy: interaction.user.id },
          $unset: { lastMessageId: "" },
        },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [
          successEmbed("Sticky message dipasang! Akan selalu muncul di bawah channel ini."),
          buildEmbed("primary").setTitle("📌 Pratinjau").setDescription(teks),
        ],
      });
      return;
    }

    // hapus
    const deleted = await StickyMessage.findOneAndDelete({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
    });
    if (deleted?.lastMessageId) {
      await interaction.channel?.messages
        .fetch(deleted.lastMessageId)
        .then((m) => m.delete())
        .catch(() => undefined);
    }
    await interaction.reply({
      embeds: [
        deleted
          ? successEmbed("Sticky message dihapus.")
          : errorEmbed("Tidak ada sticky message di channel ini."),
      ],
    });
  },
};

export default command;
