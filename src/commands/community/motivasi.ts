import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { MOTIVATION_CATEGORIES, isMotivationCategory } from "../../config/motivation";
import { postMotivation } from "../../services/community/motivationService";

const CATEGORY_CHOICES = [
  ...Object.entries(MOTIVATION_CATEGORIES).map(([key, v]) => ({
    name: `${v.emoji} ${v.label}`,
    value: key,
  })),
  { name: "🎛️ Campur (semua kategori)", value: "campur" },
];

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("motivasi")
    .setDescription("[Admin] Motivasi harian otomatis di sebuah channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Aktifkan motivasi harian.")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel tujuan.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("kategori")
            .setDescription("Kategori motivasi.")
            .setRequired(true)
            .addChoices(...CATEGORY_CHOICES),
        )
        .addIntegerOption((o) =>
          o
            .setName("interval")
            .setDescription("Kirim tiap berapa jam (1-24, default 24 = sekali sehari).")
            .setMinValue(1)
            .setMaxValue(24),
        ),
    )
    .addSubcommand((s) => s.setName("nonaktif").setDescription("Matikan motivasi harian."))
    .addSubcommand((s) =>
      s
        .setName("kirim")
        .setDescription("Kirim motivasi sekarang (uji coba).")
        .addStringOption((o) =>
          o
            .setName("kategori")
            .setDescription("Kategori.")
            .addChoices(
              ...Object.entries(MOTIVATION_CATEGORIES).map(([key, v]) => ({
                name: `${v.emoji} ${v.label}`,
                value: key,
              })),
            ),
        ),
    ),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 5,
  execute: async (interaction, client) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const channel = interaction.options.getChannel("channel", true);
      const kategori = interaction.options.getString("kategori", true);
      const interval = interaction.options.getInteger("interval") ?? 24;

      const categories = kategori === "campur" ? Object.keys(MOTIVATION_CATEGORIES) : [kategori];

      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            "motivation.enabled": true,
            "motivation.channelId": channel.id,
            "motivation.categories": categories,
            "motivation.intervalHours": interval,
            "motivation.lastPostedAt": null,
          },
        },
        { upsert: true },
      );

      const jadwal = interval === 24 ? "sekali sehari" : `setiap **${interval} jam**`;
      await interaction.reply({
        embeds: [
          successEmbed(
            `Motivasi aktif di <#${channel.id}> — ${jadwal} (kategori: ${categories.join(", ")}). ` +
              "Kiriman pertama dalam beberapa menit.",
          ),
        ],
      });
      return;
    }

    if (sub === "nonaktif") {
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { "motivation.enabled": false } },
      );
      await interaction.reply({ embeds: [successEmbed("Motivasi harian dinonaktifkan.")] });
      return;
    }

    // kirim (uji coba)
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const channelId = config?.motivation?.channelId;
    if (!channelId) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada channel motivasi. Jalankan `/motivasi setup` dulu.")],
        ephemeral: true,
      });
      return;
    }
    const chosen = interaction.options.getString("kategori");
    const categories = (config?.motivation?.categories ?? ["kehidupan"]).filter(
      isMotivationCategory,
    );
    const category =
      chosen && isMotivationCategory(chosen)
        ? chosen
        : (categories[Math.floor(Math.random() * categories.length)] ?? "kehidupan");

    await interaction.deferReply({ ephemeral: true });
    const sent = await postMotivation(client, interaction.guildId, category, channelId);
    await interaction.editReply({
      embeds: [
        sent
          ? successEmbed(`Motivasi terkirim ke <#${channelId}>.`)
          : errorEmbed("Gagal mengirim. Cek izin bot di channel itu."),
      ],
    });
  },
};

export default command;
