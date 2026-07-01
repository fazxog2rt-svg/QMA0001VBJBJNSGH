import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiCodingHelp, aiExplainCode, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-code")
    .setDescription("Bantuan coding dari AI.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tanya")
        .setDescription("Tanya sesuatu tentang programming.")
        .addStringOption((option) =>
          option
            .setName("pertanyaan")
            .setDescription("Pertanyaanmu.")
            .setRequired(true)
            .setMaxLength(1000),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("jelaskan")
        .setDescription("Minta AI menjelaskan sebuah kode.")
        .addStringOption((option) =>
          option
            .setName("kode")
            .setDescription("Kode yang dijelaskan.")
            .setRequired(true)
            .setMaxLength(1800),
        ),
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

    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    const result =
      subcommand === "tanya"
        ? await aiCodingHelp(
            interaction.guildId,
            interaction.user.id,
            interaction.options.getString("pertanyaan", true),
          )
        : await aiExplainCode(
            interaction.guildId,
            interaction.user.id,
            interaction.options.getString("kode", true),
          );

    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle("💻 AI Coding Assistant")
          .setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
