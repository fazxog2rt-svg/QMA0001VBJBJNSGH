import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { aiChat, isAiEnabledForGuild } from "../../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-chat")
    .setDescription("Ngobrol dengan AI assistant.")
    .addStringOption((option) =>
      option.setName("pesan").setDescription("Pesanmu.").setRequired(true).setMaxLength(1000),
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

    const pesan = interaction.options.getString("pesan", true);
    await interaction.deferReply();

    const result = await aiChat(interaction.guildId, interaction.user.id, pesan);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary").setTitle("🤖 AI Chat").setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
