import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Faq } from "../../database/models/Faq";
import { aiFaqAnswer, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-faq")
    .setDescription("Tanya AI berdasarkan FAQ server.")
    .addStringOption((option) =>
      option
        .setName("pertanyaan")
        .setDescription("Pertanyaanmu.")
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

    const pertanyaan = interaction.options.getString("pertanyaan", true);
    await interaction.deferReply();

    const faqs = await Faq.find({ guildId: interaction.guildId }).limit(50);
    const faqContext =
      faqs.length > 0
        ? faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")
        : "(Belum ada FAQ diatur di server ini.)";

    const result = await aiFaqAnswer(
      interaction.guildId,
      interaction.user.id,
      pertanyaan,
      faqContext,
    );
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary").setTitle("❓ AI FAQ").setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
