import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { JOBS, getJob } from "../../config/jobs";
import { buildEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("job")
    .setDescription("Sistem pekerjaan — pilih job untuk gaji /work lebih besar.")
    .addSubcommand((sub) => sub.setName("list").setDescription("Lihat daftar pekerjaan."))
    .addSubcommand((sub) =>
      sub
        .setName("pilih")
        .setDescription("Pilih sebuah pekerjaan.")
        .addStringOption((opt) =>
          opt
            .setName("pekerjaan")
            .setDescription("Pekerjaan yang dipilih.")
            .setRequired(true)
            .addChoices(...JOBS.map((j) => ({ name: `${j.emoji} ${j.label}`, value: j.key }))),
        ),
    )
    .addSubcommand((sub) => sub.setName("keluar").setDescription("Berhenti dari pekerjaan.")),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const lines = JOBS.map(
        (j) => `${j.emoji} **${j.label}** — gaji \`${j.min}–${j.max}\` 🪙 per /work`,
      );
      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle("💼 Daftar Pekerjaan")
            .setDescription(lines.join("\n"))
            .setFooter({ text: "Pilih dengan /job pilih" }),
        ],
      });
      return;
    }

    if (sub === "pilih") {
      const key = interaction.options.getString("pekerjaan", true);
      const job = getJob(key);
      if (!job) return;

      const member = await getOrCreateMember(interaction.guildId, interaction.user.id);
      member.jobKey = job.key;
      await member.save();

      await interaction.reply({
        embeds: [
          successEmbed(
            `Selamat! Kamu sekarang bekerja sebagai ${job.emoji} **${job.label}**. ` +
              `Jalankan \`/work\` untuk mendapat gaji \`${job.min}–${job.max}\` 🪙.`,
          ),
        ],
      });
      return;
    }

    // keluar
    const member = await getOrCreateMember(interaction.guildId, interaction.user.id);
    member.jobKey = undefined;
    await member.save();
    await interaction.reply({
      embeds: [successEmbed("Kamu telah berhenti dari pekerjaanmu. Gaji `/work` kembali normal.")],
    });
  },
};

export default command;
