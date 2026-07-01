import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Birthday } from "../../database/models/Birthday";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function daysInMonth(month: number, year?: number): number {
  return new Date(year ?? 2024, month, 0).getDate();
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Atur atau lihat ulang tahun.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Atur tanggal ulang tahunmu.")
        .addIntegerOption((option) =>
          option
            .setName("hari")
            .setDescription("Tanggal (1-31).")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31),
        )
        .addIntegerOption((option) =>
          option
            .setName("bulan")
            .setDescription("Bulan (1-12).")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12),
        )
        .addIntegerOption((option) =>
          option.setName("tahun").setDescription("Tahun lahir (opsional).").setMinValue(1900),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lihat")
        .setDescription("Lihat ulang tahun member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Lihat ulang tahun member lain."),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("atur-channel")
        .setDescription("[Admin] Atur channel pengumuman ulang tahun.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel pengumuman.").setRequired(true),
        ),
    ),
  category: "community",
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

    if (subcommand === "atur-channel") {
      const hasManageGuild =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
      if (!hasManageGuild) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Server**.")],
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.options.getChannel("channel", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { birthdayChannelId: channel.id } },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Channel pengumuman ulang tahun diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    if (subcommand === "set") {
      const hari = interaction.options.getInteger("hari", true);
      const bulan = interaction.options.getInteger("bulan", true);
      const tahun = interaction.options.getInteger("tahun") ?? undefined;

      if (hari > daysInMonth(bulan, tahun)) {
        await interaction.reply({
          embeds: [errorEmbed(`Tanggal tidak valid untuk bulan ${MONTH_NAMES[bulan - 1]}.`)],
          ephemeral: true,
        });
        return;
      }

      await Birthday.findOneAndUpdate(
        { guildId: interaction.guildId, userId: interaction.user.id },
        { day: hari, month: bulan, year: tahun },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Ulang tahunmu diatur ke **${hari} ${MONTH_NAMES[bulan - 1]}**.`)],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user") ?? interaction.user;
    const birthday = await Birthday.findOne({ guildId: interaction.guildId, userId: target.id });

    if (!birthday) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            target.id === interaction.user.id
              ? "Kamu belum mengatur ulang tahun. Gunakan `/birthday set`."
              : "Member ini belum mengatur ulang tahun.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🎂 Ulang Tahun")
          .setDescription(
            `<@${target.id}> lahir pada **${birthday.day} ${MONTH_NAMES[birthday.month - 1]}**${birthday.year ? ` ${birthday.year}` : ""}.`,
          ),
      ],
    });
  },
};

export default command;
