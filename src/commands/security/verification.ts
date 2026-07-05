import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildTextBasedChannel,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("verification")
    .setDescription("[Admin] Gerbang verifikasi member baru dengan tombol.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set-role")
        .setDescription("Atur role verified (dan opsional role unverified).")
        .addRoleOption((opt) =>
          opt.setName("verified").setDescription("Role setelah verifikasi.").setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("unverified").setDescription("Role sementara sebelum verifikasi (opsional)."),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Kirim panel tombol verifikasi ke sebuah channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel untuk panel verifikasi.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("pesan")
            .setDescription("Teks kustom pada panel (opsional).")
            .setMaxLength(500),
        ),
    ),
  category: "security",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "set-role") {
      const verified = interaction.options.getRole("verified", true);
      const unverified = interaction.options.getRole("unverified");

      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            "security.verifiedRoleId": verified.id,
            ...(unverified ? { "security.unverifiedRoleId": unverified.id } : {}),
          },
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [
          successEmbed(
            `Role verified diatur ke <@&${verified.id}>` +
              (unverified ? `, unverified <@&${unverified.id}>` : "") +
              ". Sekarang kirim panel dengan `/verification panel`.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // panel
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config?.security?.verifiedRoleId) {
      await interaction.reply({
        embeds: [errorEmbed("Atur dulu role verified dengan `/verification set-role`.")],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true) as GuildTextBasedChannel;
    const customText = interaction.options.getString("pesan");

    const embed = buildEmbed("primary")
      .setTitle("✅ Verifikasi Diperlukan")
      .setDescription(
        customText ??
          "Selamat datang! Untuk mengakses server ini, klik tombol **Verifikasi** di bawah. " +
            "Dengan verifikasi, kamu menyetujui aturan server.",
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("verify:panel")
        .setLabel("Verifikasi")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      embeds: [successEmbed(`Panel verifikasi dikirim ke <#${channel.id}>.`)],
      ephemeral: true,
    });
  },
};

export default command;
