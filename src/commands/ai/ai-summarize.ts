import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiSummarize, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const MAX_MESSAGES = 100;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-summarize")
    .setDescription("Ringkas pesan terbaru di channel ini dengan AI.")
    .addIntegerOption((option) =>
      option
        .setName("jumlah")
        .setDescription("Jumlah pesan (default 30, maks 100).")
        .setMinValue(5)
        .setMaxValue(MAX_MESSAGES),
    ),
  category: "ai",
  cooldownSeconds: 15,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.channel?.isTextBased()) {
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

    const jumlah = interaction.options.getInteger("jumlah") ?? 30;
    await interaction.deferReply();

    const messages = await interaction.channel.messages.fetch({ limit: jumlah });
    const conversation = [...messages.values()]
      .reverse()
      .filter((message) => message.content.trim().length > 0)
      .map((message) => `${message.author.tag}: ${message.content}`)
      .join("\n");

    if (!conversation) {
      await interaction.editReply({
        embeds: [errorEmbed("Tidak ada pesan teks yang bisa diringkas.")],
      });
      return;
    }

    const result = await aiSummarize(interaction.guildId, interaction.user.id, conversation);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle(`📝 Ringkasan ${jumlah} Pesan Terakhir`)
          .setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
