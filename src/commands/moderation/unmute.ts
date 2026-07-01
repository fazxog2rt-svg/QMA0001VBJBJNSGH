import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { createModerationCase } from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("[Moderasi] Cabut mute dari member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang di-unmute.").setRequired(true),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const mutedRoleId = guildConfig?.moderation?.mutedRoleId;

    if (!mutedRoleId) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada role Muted yang dikonfigurasi.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.roles.cache.has(mutedRoleId)) {
      await interaction.reply({
        embeds: [errorEmbed("Member ini tidak sedang dibisukan.")],
        ephemeral: true,
      });
      return;
    }

    await member.roles.remove(mutedRoleId, "Unmute");
    const moderationCase = await createModerationCase(
      interaction.guildId,
      "unmute",
      target.id,
      interaction.user.id,
      "Unmute",
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Unmute #${moderationCase.caseNumber}`,
    });

    await interaction.reply({
      embeds: [successEmbed(`🔊 <@${target.id}> di-unmute (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
