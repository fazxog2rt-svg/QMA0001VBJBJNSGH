import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("counting")
    .setDescription("[Admin] Game hitung angka berurutan di satu channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Aktifkan counting di sebuah channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel counting.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("nonaktif").setDescription("Matikan counting."))
    .addSubcommand((sub) => sub.setName("status").setDescription("Lihat status counting.")),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const channel = interaction.options.getChannel("channel", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            "counting.channelId": channel.id,
            "counting.current": 0,
            "counting.lastUserId": null,
          },
        },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [
          successEmbed(
            `Counting aktif di <#${channel.id}>! Mulai dari **1**. ` +
              "Tiap orang menghitung berurutan, tidak boleh dua kali berturut-turut. Salah = reset ke 0.",
          ),
        ],
      });
      return;
    }

    if (sub === "nonaktif") {
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { "counting.channelId": null } },
      );
      await interaction.reply({ embeds: [successEmbed("Counting dinonaktifkan.")] });
      return;
    }

    // status
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const c = config?.counting;
    if (!c?.channelId) {
      await interaction.reply({
        embeds: [buildEmbed("primary").setDescription("Counting belum aktif.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🔢 Status Counting")
          .setDescription(
            `Channel: <#${c.channelId}>\nHitungan sekarang: **${c.current ?? 0}**\n` +
              `Angka berikutnya: **${(c.current ?? 0) + 1}**\nRekor tertinggi: **${c.highScore ?? 0}**`,
          ),
      ],
    });
  },
};

export default command;
