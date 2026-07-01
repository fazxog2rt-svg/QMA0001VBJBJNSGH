import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import {
  getOrCreateMember,
  updateBanner,
  computeAchievementProgress,
} from "../../services/profile/profileService";
import { renderProfileCard } from "../../services/profile/profileCardRenderer";
import { buildProfileEditModal } from "../../services/profile/profileModal";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Profil member premium.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lihat")
        .setDescription("Lihat profil member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Lihat profil member lain."),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit bio, pronouns, warna favorit, media sosial, dan banner.")
        .addAttachmentOption((option) =>
          option
            .setName("banner")
            .setDescription("Gambar banner profil baru (opsional).")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("achievements").setDescription("Lihat progres achievement-mu."),
    ),
  category: "profile",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "lihat") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      await interaction.deferReply();

      const member = await getOrCreateMember(interaction.guildId, target.id);
      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

      const cardBuffer = await renderProfileCard({
        member,
        displayName: guildMember?.displayName ?? target.username,
        avatarUrl: target.displayAvatarURL({ size: 256, extension: "png" }),
        joinedAt: guildMember?.joinedAt ?? null,
      });

      await interaction.editReply({
        files: [new AttachmentBuilder(cardBuffer, { name: `profile-${target.id}.png` })],
      });
      return;
    }

    if (subcommand === "edit") {
      const bannerAttachment = interaction.options.getAttachment("banner");
      if (bannerAttachment) {
        await updateBanner(interaction.guildId, interaction.user.id, bannerAttachment.url);
      }

      const member = await getOrCreateMember(interaction.guildId, interaction.user.id);
      await interaction.showModal(buildProfileEditModal(member));
      return;
    }

    if (subcommand === "achievements") {
      await interaction.deferReply({ ephemeral: true });

      const member = await getOrCreateMember(interaction.guildId, interaction.user.id);
      const achievements = computeAchievementProgress(member);

      const embed = buildEmbed("primary")
        .setTitle("🏆 Progres Achievement")
        .setDescription(
          achievements
            .map((achievement) => {
              const icon = achievement.completed ? "✅" : "⬜";
              return `${icon} **${achievement.name}** — ${achievement.description}\n${achievement.progress}/${achievement.target}`;
            })
            .join("\n\n"),
        );

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
