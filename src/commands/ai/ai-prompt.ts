import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiGeneratePrompt, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-prompt")
    .setDescription("Buat prompt AI yang efektif untuk sebuah topik.")
    .addStringOption((option) =>
      option
        .setName("topik")
        .setDescription("Topik atau tujuan prompt.")
        .setRequired(true)
        .setMaxLength(500),
    ),
  category: "ai",
  cooldownSeconds: 8,
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

    const topik = interaction.options.getString("topik", true);
    await interaction.deferReply();

    const result = await aiGeneratePrompt(interaction.guildId, interaction.user.id, topik);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle("✨ Prompt Generator")
          .setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
