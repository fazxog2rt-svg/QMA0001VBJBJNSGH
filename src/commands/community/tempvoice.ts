import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { TempVoiceChannel } from "../../database/models/TempVoiceChannel";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tempvoice")
    .setDescription("Voice channel sementara.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("[Admin] Atur hub untuk temporary voice channel.")
        .addChannelOption((option) =>
          option
            .setName("hub")
            .setDescription("Channel 'Join to Create'.")
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("kategori")
            .setDescription("Kategori tempat channel baru dibuat.")
            .addChannelTypes(ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("kunci").setDescription("Kunci voice channel-mu saat ini."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("buka").setDescription("Buka kunci voice channel-mu saat ini."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("limit")
        .setDescription("Atur limit member voice channel-mu.")
        .addIntegerOption((option) =>
          option
            .setName("jumlah")
            .setDescription("0 = tanpa limit.")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99),
        ),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      const hasManageGuild =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
      if (!hasManageGuild) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Server**.")],
          ephemeral: true,
        });
        return;
      }

      const hub = interaction.options.getChannel("hub", true);
      const kategori = interaction.options.getChannel("kategori");

      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            "tempVoice.enabled": true,
            "tempVoice.hubChannelId": hub.id,
            "tempVoice.categoryChannelId": kategori?.id,
          },
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [
          successEmbed(
            `Temporary voice channel diaktifkan. Member yang join <#${hub.id}> akan dibuatkan channel baru.`,
          ),
        ],
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const currentChannelId = member.voice.channelId;

    if (!currentChannelId) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu harus berada di voice channel-mu sendiri.")],
        ephemeral: true,
      });
      return;
    }

    const record = await TempVoiceChannel.findOne({ channelId: currentChannelId });
    if (!record || record.ownerId !== interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed("Ini bukan voice channel sementara milikmu.")],
        ephemeral: true,
      });
      return;
    }

    const channel = member.voice.channel;
    if (!channel?.isVoiceBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Channel tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "kunci") {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
      record.locked = true;
      await record.save();
      await interaction.reply({
        embeds: [successEmbed("🔒 Voice channel dikunci.")],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "buka") {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
      record.locked = false;
      await record.save();
      await interaction.reply({
        embeds: [successEmbed("🔓 Voice channel dibuka.")],
        ephemeral: true,
      });
      return;
    }

    const jumlah = interaction.options.getInteger("jumlah", true);
    await channel.setUserLimit(jumlah);
    await interaction.reply({
      embeds: [
        successEmbed(
          jumlah === 0 ? "Limit member dihapus." : `Limit member diatur ke **${jumlah}**.`,
        ),
      ],
      ephemeral: true,
    });
  },
};

export default command;
