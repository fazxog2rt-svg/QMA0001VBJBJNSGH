import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import {
  createModerationCase,
  dmModerationNotice,
  isModerationTargetSafe,
} from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("[Moderasi] Ban atau buka ban member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand((s) =>
      s
        .setName("pasang")
        .setDescription("Ban member dari server.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang dibanned.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("alasan").setDescription("Alasan ban.").setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName("hapus-pesan-hari")
            .setDescription("Hapus pesan N hari terakhir (0-7).")
            .setMinValue(0)
            .setMaxValue(7),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("cabut")
        .setDescription("Cabut ban dari user (unban).")
        .addStringOption((option) =>
          option
            .setName("user_id")
            .setDescription("ID Discord user yang di-unban.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("alasan").setDescription("Alasan unban.").setMaxLength(500),
        ),
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

    const sub = interaction.options.getSubcommand();

    if (sub === "cabut") {
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
      return;
    }

    // sub === "pasang"
    const target = interaction.options.getUser("user", true);
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";
    const deleteMessageDays = interaction.options.getInteger("hapus-pesan-hari") ?? 0;

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa ban target ini.")],
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

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "🔨 Kamu dibanned dari server",
      alasan,
    );
    await interaction.guild.members.ban(target.id, {
      reason: alasan,
      deleteMessageSeconds: deleteMessageDays * 86_400,
    });

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "ban",
      target.id,
      interaction.user.id,
      alasan,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Ban #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [successEmbed(`🔨 <@${target.id}> dibanned (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
