import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { getCurrencySymbol } from "../../services/economy/economyService";
import { getJob } from "../../config/jobs";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const WORK_COOLDOWN_MS = 60 * 60 * 1000;
const WORK_MIN = 50;
const WORK_MAX = 250;

const WORK_MESSAGES = [
  "Kamu ngoding bot Discord dan dibayar",
  "Kamu jualan es teh di warung dan dapat",
  "Kamu jadi joki push rank dan dibayar",
  "Kamu ngonten TikTok dan dapat endorse",
  "Kamu benerin laptop tetangga dan dapat",
];

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Kerja untuk mendapatkan koin (cooldown 1 jam)."),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const member = await getOrCreateMember(interaction.guildId, interaction.user.id);
    const now = Date.now();

    if (member.lastWorkAt && now - member.lastWorkAt.getTime() < WORK_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (WORK_COOLDOWN_MS - (now - member.lastWorkAt.getTime())) / 60_000,
      );
      await interaction.reply({
        embeds: [errorEmbed(`Kamu masih lelah. Kerja lagi dalam **${remaining} menit**.`)],
        ephemeral: true,
      });
      return;
    }

    // Jika member punya pekerjaan, pakai rentang gaji pekerjaan itu.
    const job = getJob(member.jobKey);
    const min = job?.min ?? WORK_MIN;
    const max = job?.max ?? WORK_MAX;

    const earned = Math.floor(Math.random() * (max - min + 1)) + min;
    const message = job
      ? `${job.emoji} Kamu bekerja sebagai **${job.label}** dan dapat`
      : WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)]!;

    member.walletBalance += earned;
    member.lastWorkAt = new Date();
    await member.save();

    const symbol = await getCurrencySymbol(interaction.guildId);
    await interaction.reply({
      embeds: [
        buildEmbed("success").setDescription(
          `💼 ${message} **${symbol} ${earned.toLocaleString("id-ID")}**!`,
        ),
      ],
    });
  },
};

export default command;
