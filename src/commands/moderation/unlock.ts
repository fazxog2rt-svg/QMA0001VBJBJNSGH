import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("[Moderasi] Buka kembali kunci channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel yang dibuka (default: channel ini).")
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

    const channelOption = interaction.options.getChannel("channel");
    const channel = channelOption
      ? interaction.guild.channels.cache.get(channelOption.id)
      : interaction.channel;

    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
    });
    await interaction.reply({
      embeds: [successEmbed(`🔓 <#${channel.id}> telah dibuka kembali.`)],
    });
  },
};

export default command;
