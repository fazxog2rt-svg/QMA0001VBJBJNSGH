import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import {
  createModerationCase,
  dmModerationNotice,
  getOrCreateMutedRole,
  isModerationTargetSafe,
} from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("[Moderasi] Bisukan atau lepaskan bisu member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("pasang")
        .setDescription("Bisukan member (role Muted, tanpa batas waktu).")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang dibisukan.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("alasan").setDescription("Alasan mute.").setMaxLength(500),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("cabut")
        .setDescription("Cabut mute dari member (unmute).")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang di-unmute.").setRequired(true),
        ),
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

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser("user", true);

    if (sub === "cabut") {
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
        embeds: [
          successEmbed(`🔊 <@${target.id}> di-unmute (Case #${moderationCase.caseNumber}).`),
        ],
      });
      return;
    }

    // sub === "pasang"
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa mute target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        embeds: [errorEmbed("Member tidak ditemukan di server ini.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const mutedRoleId = await getOrCreateMutedRole(interaction.guild);
    await member.roles.add(mutedRoleId, alasan);

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "mute",
      target.id,
      interaction.user.id,
      alasan,
    );
    await dmModerationNotice(target, interaction.guild.name, "🔇 Kamu dibisukan", alasan);

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Mute #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.editReply({
      embeds: [successEmbed(`🔇 <@${target.id}> dibisukan (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
