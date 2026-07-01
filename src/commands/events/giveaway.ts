import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Giveaway } from "../../database/models/Giveaway";
import { parseDurationMs } from "../../services/community/timeParser";
import {
  buildGiveawayComponents,
  buildGiveawayEmbed,
  endGiveaway,
} from "../../services/events/giveawayService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Kelola giveaway.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mulai")
        .setDescription("Mulai giveaway baru.")
        .addStringOption((option) =>
          option
            .setName("hadiah")
            .setDescription("Hadiah giveaway.")
            .setRequired(true)
            .setMaxLength(200),
        )
        .addStringOption((option) =>
          option.setName("durasi").setDescription("Durasi, mis. 1h, 1d, 3d12h.").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("pemenang")
            .setDescription("Jumlah pemenang (default 1).")
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("akhiri")
        .setDescription("Akhiri giveaway lebih awal & undi pemenang.")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("ID pesan giveaway.").setRequired(true),
        ),
    ),
  category: "events",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "mulai") {
      const hadiah = interaction.options.getString("hadiah", true);
      const durasi = interaction.options.getString("durasi", true);
      const pemenang = interaction.options.getInteger("pemenang") ?? 1;

      const durationMs = parseDurationMs(durasi);
      if (!durationMs || durationMs <= 0) {
        await interaction.reply({
          embeds: [errorEmbed("Format durasi tidak valid. Contoh: `1h`, `1d`, `3d12h`.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const giveaway = await Giveaway.create({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: "pending",
        prize: hadiah,
        winnerCount: pemenang,
        hostedBy: interaction.user.id,
        endsAt: new Date(Date.now() + durationMs),
      });

      const message = await interaction.channel.send({
        embeds: [buildGiveawayEmbed(giveaway)],
        components: buildGiveawayComponents(giveaway._id.toString(), false),
      });

      giveaway.messageId = message.id;
      await giveaway.save();

      await interaction.editReply({ embeds: [successEmbed(`Giveaway **${hadiah}** dimulai!`)] });
      return;
    }

    const messageId = interaction.options.getString("message_id", true);
    const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guildId });

    if (!giveaway || giveaway.ended) {
      await interaction.reply({
        embeds: [errorEmbed("Giveaway tidak ditemukan atau sudah berakhir.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(interaction.client, giveaway);
    await interaction.editReply({
      embeds: [successEmbed("Giveaway diakhiri & pemenang telah diundi.")],
    });
  },
};

export default command;
