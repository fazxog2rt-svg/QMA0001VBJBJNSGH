import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import {
  createModerationCase,
  dmModerationNotice,
  isModerationTargetSafe,
} from "../../services/moderation/moderationService";
import { parseDurationMs } from "../../services/community/timeParser";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("[Moderasi] Ban member untuk jangka waktu tertentu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang di-tempban.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("durasi").setDescription("Contoh: 1d, 12h, 3d12h.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan tempban.").setMaxLength(500),
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

    const target = interaction.options.getUser("user", true);
    const durasiInput = interaction.options.getString("durasi", true);
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";

    const durationMs = parseDurationMs(durasiInput);
    if (!durationMs || durationMs <= 0) {
      await interaction.reply({
        embeds: [errorEmbed("Format durasi tidak valid. Contoh: `1d`, `12h`, `3d12h`.")],
        ephemeral: true,
      });
      return;
    }

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa tempban target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({
        embeds: [errorEmbed("Aku tidak punya izin untuk ban member ini (role lebih tinggi).")],
        ephemeral: true,
      });
      return;
    }

    const expiresAt = new Date(Date.now() + durationMs);

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "🔨 Kamu di-tempban dari server",
      alasan,
      `Ban akan berakhir otomatis <t:${Math.floor(expiresAt.getTime() / 1000)}:R>.`,
    );

    await interaction.guild.members.ban(target.id, { reason: `Tempban: ${alasan}` });

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "tempban",
      target.id,
      interaction.user.id,
      alasan,
      {
        duration: durationMs,
        expiresAt,
      },
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Tempban #${moderationCase.caseNumber} hingga ${expiresAt.toISOString()}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `🔨 <@${target.id}> di-tempban hingga <t:${Math.floor(expiresAt.getTime() / 1000)}:F> (Case #${moderationCase.caseNumber}).`,
        ),
      ],
    });
  },
};

export default command;
