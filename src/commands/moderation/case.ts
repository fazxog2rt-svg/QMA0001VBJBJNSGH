import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { ModerationCase } from "../../database/models/ModerationCase";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("[Moderasi] Lihat riwayat kasus moderasi.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lihat")
        .setDescription("Lihat detail satu kasus.")
        .addIntegerOption((option) =>
          option.setName("nomor").setDescription("Nomor kasus.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("riwayat")
        .setDescription("Lihat semua kasus milik member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member target.").setRequired(true),
        ),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ModerateMembers],
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

    if (subcommand === "lihat") {
      const nomor = interaction.options.getInteger("nomor", true);
      const moderationCase = await ModerationCase.findOne({
        guildId: interaction.guildId,
        caseNumber: nomor,
      });

      if (!moderationCase) {
        await interaction.reply({
          embeds: [errorEmbed(`Kasus #${nomor} tidak ditemukan.`)],
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle(`📋 Kasus #${moderationCase.caseNumber}`)
            .addFields(
              { name: "Tipe", value: moderationCase.type, inline: true },
              { name: "Target", value: `<@${moderationCase.targetId}>`, inline: true },
              { name: "Moderator", value: `<@${moderationCase.moderatorId}>`, inline: true },
              { name: "Alasan", value: moderationCase.reason },
              { name: "Status", value: moderationCase.active ? "🟢 Aktif" : "⚪ Selesai" },
            ),
        ],
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const cases = await ModerationCase.find({
      guildId: interaction.guildId,
      targetId: target.id,
    }).sort({ caseNumber: -1 });

    if (cases.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Member ini belum punya riwayat moderasi.")],
        ephemeral: true,
      });
      return;
    }

    const perPage = 8;
    const embeds = [];
    for (let i = 0; i < cases.length; i += perPage) {
      const lines = cases
        .slice(i, i + perPage)
        .map(
          (moderationCase) =>
            `**#${moderationCase.caseNumber}** [${moderationCase.type}] — ${moderationCase.reason}`,
        );
      embeds.push(
        buildEmbed("primary")
          .setTitle(`📋 Riwayat Moderasi — ${target.tag}`)
          .setDescription(lines.join("\n")),
      );
    }

    await interaction.deferReply();
    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
