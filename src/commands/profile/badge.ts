import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { BADGE_DEFINITIONS, type BadgeKey } from "../../config/constants";
import { grantBadge, revokeBadge } from "../../services/profile/profileService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("badge")
    .setDescription("[Admin] Kelola badge member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("beri")
        .setDescription("Berikan badge ke member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member penerima badge.").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("badge")
            .setDescription("Badge yang diberikan.")
            .setRequired(true)
            .addChoices(
              ...BADGE_DEFINITIONS.map((badge) => ({
                name: `${badge.emoji} ${badge.name}`,
                value: badge.key,
              })),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cabut")
        .setDescription("Cabut badge dari member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang badge-nya dicabut.").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("badge")
            .setDescription("Badge yang dicabut.")
            .setRequired(true)
            .addChoices(
              ...BADGE_DEFINITIONS.map((badge) => ({
                name: `${badge.emoji} ${badge.name}`,
                value: badge.key,
              })),
            ),
        ),
    ),
  category: "profile",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser("user", true);
    const badgeKey = interaction.options.getString("badge", true) as BadgeKey;
    const badgeDefinition = BADGE_DEFINITIONS.find((badge) => badge.key === badgeKey);

    if (!badgeDefinition) {
      await interaction.reply({ embeds: [errorEmbed("Badge tidak ditemukan.")], ephemeral: true });
      return;
    }

    if (subcommand === "beri") {
      await grantBadge(interaction.guildId, target.id, badgeKey, interaction.user.id);

      await ActivityLog.create({
        guildId: interaction.guildId,
        type: "role",
        actorId: interaction.user.id,
        targetId: target.id,
        description: `Badge ${badgeDefinition.name} diberikan kepada <@${target.id}>.`,
      });

      await interaction.reply({
        embeds: [
          successEmbed(
            `${badgeDefinition.emoji} Badge **${badgeDefinition.name}** diberikan kepada <@${target.id}>.`,
          ),
        ],
      });
      return;
    }

    await revokeBadge(interaction.guildId, target.id, badgeKey);

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "role",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Badge ${badgeDefinition.name} dicabut dari <@${target.id}>.`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `${badgeDefinition.emoji} Badge **${badgeDefinition.name}** dicabut dari <@${target.id}>.`,
        ),
      ],
    });
  },
};

export default command;
