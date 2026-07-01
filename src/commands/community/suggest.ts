import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Suggestion } from "../../database/models/Suggestion";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Kirim atau kelola saran untuk server.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kirim")
        .setDescription("Kirim saran baru.")
        .addStringOption((option) =>
          option.setName("isi").setDescription("Isi saranmu.").setRequired(true).setMaxLength(1000),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("atur-channel")
        .setDescription("[Admin] Atur channel untuk saran.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel saran.").setRequired(true),
        ),
    ),
  category: "community",
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
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
        { $set: { "suggestions.channelId": channel.id } },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Channel saran diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const channelId = guildConfig?.suggestions?.channelId;
    if (!channelId) {
      await interaction.reply({
        embeds: [
          errorEmbed("Channel saran belum diatur. Admin bisa pakai `/suggest atur-channel`."),
        ],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Channel saran tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    const isi = interaction.options.getString("isi", true);

    const embed = buildEmbed("primary")
      .setTitle("💡 Saran Baru")
      .setDescription(isi)
      .setFooter({ text: `Dikirim oleh ${interaction.user.tag}` })
      .addFields({ name: "Status", value: "⏳ Menunggu tinjauan" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("suggestion:approve")
        .setLabel("Setujui")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("suggestion:deny")
        .setLabel("Tolak")
        .setStyle(ButtonStyle.Danger),
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    await message.react("👍").catch(() => undefined);
    await message.react("👎").catch(() => undefined);

    await Suggestion.create({
      guildId: interaction.guildId,
      channelId: channel.id,
      messageId: message.id,
      authorId: interaction.user.id,
      content: isi,
    });

    await interaction.reply({
      embeds: [successEmbed(`Saranmu telah dikirim ke <#${channel.id}>!`)],
      ephemeral: true,
    });
  },
};

export default command;
