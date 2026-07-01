import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("[Moderasi] Atur slowmode channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) =>
      option
        .setName("detik")
        .setDescription("Detik jeda (0 = nonaktif, maks 21600).")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21_600),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel target (default: channel ini).")
        .addChannelTypes(ChannelType.GuildText),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ManageChannels],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const detik = interaction.options.getInteger("detik", true);
    const channelOption = interaction.options.getChannel("channel");
    const channel = channelOption
      ? interaction.guild.channels.cache.get(channelOption.id)
      : interaction.channel;

    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    await channel.setRateLimitPerUser(detik);
    await interaction.reply({
      embeds: [
        successEmbed(
          detik === 0
            ? `Slowmode di <#${channel.id}> dinonaktifkan.`
            : `Slowmode di <#${channel.id}> diatur ke **${detik} detik**.`,
        ),
      ],
    });
  },
};

export default command;
