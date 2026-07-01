import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("anon")
    .setDescription("Kirim pesan anonim ke sebuah channel.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel tujuan.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("pesan").setDescription("Isi pesan.").setRequired(true).setMaxLength(1500),
    ),
  category: "community",
  cooldownSeconds: 15,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const pesan = interaction.options.getString("pesan", true);

    const resolvedChannel = interaction.guild.channels.cache.get(channel.id);
    if (!resolvedChannel?.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    const member = interaction.member;
    const canSendInChannel =
      member && "permissionsIn" in member
        ? resolvedChannel.permissionsFor(member)?.has(PermissionFlagsBits.SendMessages)
        : false;

    if (!canSendInChannel) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak punya izin mengirim pesan di channel tersebut.")],
        ephemeral: true,
      });
      return;
    }

    await resolvedChannel.send({
      embeds: [buildEmbed("info").setDescription(pesan).setFooter({ text: "Pesan anonim" })],
    });

    await interaction.reply({
      embeds: [successEmbed(`Pesan anonimmu telah dikirim ke <#${channel.id}>!`)],
      ephemeral: true,
    });
  },
};

export default command;
