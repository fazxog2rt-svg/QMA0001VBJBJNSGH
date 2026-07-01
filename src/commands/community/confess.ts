import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Confession } from "../../database/models/Confession";
import { getNextSequence } from "../../database/models/Counter";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Kirim confession secara anonim.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kirim")
        .setDescription("Kirim confession-mu.")
        .addStringOption((option) =>
          option
            .setName("pesan")
            .setDescription("Isi confession.")
            .setRequired(true)
            .setMaxLength(1500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("atur-channel")
        .setDescription("[Admin] Atur channel confession.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel confession.").setRequired(true),
        ),
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
        { $set: { "confession.channelId": channel.id } },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Channel confession diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const channelId = guildConfig?.confession?.channelId;
    if (!channelId) {
      await interaction.reply({
        embeds: [
          errorEmbed("Channel confession belum diatur. Admin bisa pakai `/confess atur-channel`."),
        ],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Channel confession tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    const pesan = interaction.options.getString("pesan", true);
    const confessionNumber = await getNextSequence(`confession:${interaction.guildId}`);

    await channel.send({
      embeds: [
        buildEmbed("premium")
          .setTitle(`🤫 Confession #${confessionNumber}`)
          .setDescription(pesan)
          .setFooter({ text: "Identitas pengirim dirahasiakan." }),
      ],
    });

    await Confession.create({
      guildId: interaction.guildId,
      channelId: channel.id,
      authorId: interaction.user.id,
      content: pesan,
      confessionNumber,
    });

    await interaction.reply({
      embeds: [successEmbed("Confession-mu telah dikirim secara anonim!")],
      ephemeral: true,
    });
  },
};

export default command;
