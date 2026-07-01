import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { createModerationCase } from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("[Moderasi] Cabut ban dari user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option.setName("user_id").setDescription("ID Discord user yang di-unban.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan unban.").setMaxLength(500),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.BanMembers],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.options.getString("user_id", true);
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";

    const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!banEntry) {
      await interaction.reply({
        embeds: [errorEmbed("User ini tidak sedang dibanned.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.guild.members.unban(userId, alasan);

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "unban",
      userId,
      interaction.user.id,
      alasan,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: userId,
      description: `Unban #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(`✅ <@${userId}> telah di-unban (Case #${moderationCase.caseNumber}).`),
      ],
    });
  },
};

export default command;
