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

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("[Moderasi] Timeout member atau cabut timeout.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("pasang")
        .setDescription("Timeout member (fitur bawaan Discord, maks 28 hari).")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang di-timeout.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("durasi").setDescription("Contoh: 10m, 1h, 1d.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("alasan").setDescription("Alasan timeout.").setMaxLength(500),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("cabut")
        .setDescription("Cabut timeout dari member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang di-untimeout.").setRequired(true),
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
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member?.isCommunicationDisabled()) {
        await interaction.reply({
          embeds: [errorEmbed("Member ini tidak sedang di-timeout.")],
          ephemeral: true,
        });
        return;
      }

      await member.timeout(null, "Timeout dicabut manual");
      const moderationCase = await createModerationCase(
        interaction.guildId,
        "timeout",
        target.id,
        interaction.user.id,
        "Timeout dicabut",
      );
      await ActivityLog.create({
        guildId: interaction.guildId,
        type: "moderation",
        actorId: interaction.user.id,
        targetId: target.id,
        description: `Timeout dicabut #${moderationCase.caseNumber}`,
      });
      await interaction.reply({
        embeds: [
          successEmbed(`✅ Timeout <@${target.id}> dicabut (Case #${moderationCase.caseNumber}).`),
        ],
      });
      return;
    }

    // sub === "pasang"
    const durasiInput = interaction.options.getString("durasi", true);
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";

    const durationMs = parseDurationMs(durasiInput);
    if (!durationMs || durationMs <= 0) {
      await interaction.reply({
        embeds: [errorEmbed("Format durasi tidak valid. Contoh: `10m`, `1h`, `1d`.")],
        ephemeral: true,
      });
      return;
    }

    if (durationMs > MAX_TIMEOUT_MS) {
      await interaction.reply({
        embeds: [errorEmbed("Durasi timeout maksimal adalah 28 hari.")],
        ephemeral: true,
      });
      return;
    }

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa timeout target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.moderatable) {
      await interaction.reply({
        embeds: [errorEmbed("Aku tidak punya izin untuk timeout member ini.")],
        ephemeral: true,
      });
      return;
    }

    await member.timeout(durationMs, alasan);
    const expiresAt = new Date(Date.now() + durationMs);

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "timeout",
      target.id,
      interaction.user.id,
      alasan,
      { duration: durationMs, expiresAt },
    );

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "⏳ Kamu di-timeout",
      alasan,
      `Berakhir <t:${Math.floor(expiresAt.getTime() / 1000)}:R>.`,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Timeout #${moderationCase.caseNumber} hingga ${expiresAt.toISOString()}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `⏳ <@${target.id}> di-timeout hingga <t:${Math.floor(expiresAt.getTime() / 1000)}:F> (Case #${moderationCase.caseNumber}).`,
        ),
      ],
    });
  },
};

export default command;
