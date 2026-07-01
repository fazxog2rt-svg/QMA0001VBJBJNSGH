import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiModerationAssessment, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-moderate")
    .setDescription(
      "[Moderasi] Minta AI menganalisis risiko sebuah pesan (hanya rekomendasi, bukan tindakan otomatis).",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((option) =>
      option
        .setName("pesan")
        .setDescription("Isi pesan yang dianalisis.")
        .setRequired(true)
        .setMaxLength(1500),
    ),
  category: "ai",
  requiredPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const enabled = await isAiEnabledForGuild(interaction.guildId);
    if (!enabled) {
      await interaction.reply({
        embeds: [
          errorEmbed("Fitur AI belum diaktifkan di server ini. Admin bisa pakai `/ai-toggle`."),
        ],
        ephemeral: true,
      });
      return;
    }

    const pesan = interaction.options.getString("pesan", true);
    await interaction.deferReply({ ephemeral: true });

    const result = await aiModerationAssessment(interaction.guildId, interaction.user.id, pesan);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("warning")
          .setTitle("🛡️ AI Moderator — Analisis Risiko")
          .setDescription(result.content.slice(0, 4000))
          .setFooter({ text: "Ini hanya rekomendasi. Keputusan akhir tetap di tangan moderator." }),
      ],
    });
  },
};

export default command;
