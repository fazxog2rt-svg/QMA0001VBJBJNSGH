import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Reminder } from "../../database/models/Reminder";
import { parseDurationMs } from "../../services/community/timeParser";
import { errorEmbed, successEmbed } from "../../utils/embed";

const MAX_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Atur pengingat.")
    .addStringOption((option) =>
      option.setName("waktu").setDescription("Contoh: 10m, 2h, 1d2h30m.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("pesan").setDescription("Isi pengingat.").setRequired(true).setMaxLength(500),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.channelId) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const waktu = interaction.options.getString("waktu", true);
    const pesan = interaction.options.getString("pesan", true);

    const durationMs = parseDurationMs(waktu);
    if (!durationMs || durationMs <= 0) {
      await interaction.reply({
        embeds: [errorEmbed("Format waktu tidak valid. Contoh: `10m`, `2h`, `1d2h30m`.")],
        ephemeral: true,
      });
      return;
    }

    if (durationMs > MAX_DURATION_MS) {
      await interaction.reply({
        embeds: [errorEmbed("Waktu maksimal untuk reminder adalah 90 hari.")],
        ephemeral: true,
      });
      return;
    }

    const remindAt = new Date(Date.now() + durationMs);

    await Reminder.create({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      message: pesan,
      remindAt,
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Oke! Aku akan mengingatkanmu <t:${Math.floor(remindAt.getTime() / 1000)}:R>.`,
        ),
      ],
      ephemeral: true,
    });
  },
};

export default command;
