import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { createModerationCase } from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("[Moderasi] Hapus banyak pesan sekaligus.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("jumlah")
        .setDescription("Jumlah pesan (1-100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Hanya hapus pesan dari user ini."),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ManageMessages],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di text channel server.")],
        ephemeral: true,
      });
      return;
    }

    const jumlah = interaction.options.getInteger("jumlah", true);
    const targetUser = interaction.options.getUser("user");

    await interaction.deferReply({ ephemeral: true });

    const messages = await interaction.channel.messages.fetch({ limit: jumlah });
    const filtered = targetUser
      ? messages.filter((message) => message.author.id === targetUser.id)
      : messages;

    const deleted = await interaction.channel.bulkDelete(filtered, true).catch(() => null);
    if (!deleted) {
      await interaction.editReply({
        embeds: [errorEmbed("Gagal menghapus pesan (mungkin lebih tua dari 14 hari).")],
      });
      return;
    }

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "purge",
      targetUser?.id ?? interaction.channelId,
      interaction.user.id,
      `Menghapus ${deleted.size} pesan di #${interaction.channel.name}`,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "message",
      actorId: interaction.user.id,
      description: `Purge #${moderationCase.caseNumber}: ${deleted.size} pesan dihapus di #${interaction.channel.name}`,
    });

    await interaction.editReply({
      embeds: [successEmbed(`🧹 ${deleted.size} pesan berhasil dihapus.`)],
    });
  },
};

export default command;
