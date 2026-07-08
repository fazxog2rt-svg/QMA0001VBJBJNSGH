import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("[Moderasi] Kunci atau buka kembali channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) =>
      s
        .setName("pasang")
        .setDescription("Kunci channel agar @everyone tidak bisa kirim pesan.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel yang dikunci (default: channel ini).")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("cabut")
        .setDescription("Buka kembali kunci channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel yang dibuka (default: channel ini).")
            .addChannelTypes(ChannelType.GuildText),
        ),
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

    const sub = interaction.options.getSubcommand();
    const channelOption = interaction.options.getChannel("channel");
    const channel = channelOption
      ? interaction.guild.channels.cache.get(channelOption.id)
      : interaction.channel;

    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    if (sub === "cabut") {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      });
      await interaction.reply({
        embeds: [successEmbed(`🔓 <#${channel.id}> telah dibuka kembali.`)],
      });
      return;
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
    });
    await interaction.reply({ embeds: [successEmbed(`🔒 <#${channel.id}> telah dikunci.`)] });
  },
};

export default command;
