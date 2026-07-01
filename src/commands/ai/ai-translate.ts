import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiTranslate, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-translate")
    .setDescription("Terjemahkan teks dengan AI.")
    .addStringOption((option) =>
      option
        .setName("teks")
        .setDescription("Teks yang diterjemahkan.")
        .setRequired(true)
        .setMaxLength(1000),
    )
    .addStringOption((option) =>
      option
        .setName("bahasa")
        .setDescription("Bahasa tujuan (mis. Inggris, Jepang).")
        .setRequired(true),
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

    const teks = interaction.options.getString("teks", true);
    const bahasa = interaction.options.getString("bahasa", true);
    await interaction.deferReply();

    const result = await aiTranslate(interaction.guildId, interaction.user.id, teks, bahasa);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle(`🌐 Terjemahan (${bahasa})`)
          .setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
