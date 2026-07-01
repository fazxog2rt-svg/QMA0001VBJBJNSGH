import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("[Admin] Kirim pengumuman ke sebuah channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel tujuan.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("judul")
        .setDescription("Judul pengumuman.")
        .setRequired(true)
        .setMaxLength(256),
    )
    .addStringOption((option) =>
      option.setName("isi").setDescription("Isi pengumuman.").setRequired(true).setMaxLength(4000),
    )
    .addBooleanOption((option) =>
      option.setName("mention-everyone").setDescription("Mention @everyone?"),
    ),
  category: "utility",
  requiredPermissions: [PermissionFlagsBits.ManageMessages],
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.guild.channels.cache.get(
      interaction.options.getChannel("channel", true).id,
    );
    if (!channel?.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed("Channel tidak valid.")], ephemeral: true });
      return;
    }

    const judul = interaction.options.getString("judul", true);
    const isi = interaction.options.getString("isi", true);
    const mentionEveryone = interaction.options.getBoolean("mention-everyone") ?? false;

    const canMentionEveryone =
      interaction.memberPermissions?.has(PermissionFlagsBits.MentionEveryone) ?? false;

    await channel.send({
      content: mentionEveryone && canMentionEveryone ? "@everyone" : undefined,
      embeds: [
        buildEmbed("premium")
          .setTitle(`📢 ${judul}`)
          .setDescription(isi)
          .setFooter({ text: `Diumumkan oleh ${interaction.user.tag}` }),
      ],
    });

    await interaction.reply({
      embeds: [successEmbed(`Pengumuman dikirim ke <#${channel.id}>.`)],
      ephemeral: true,
    });
  },
};

export default command;
