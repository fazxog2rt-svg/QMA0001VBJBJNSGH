import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import type { ContextMenuCommand } from "../types/command";
import { isAiEnabledForGuild, aiExplainCode } from "../services/ai/aiService";
import { buildEmbed, errorEmbed } from "../utils/embed";

const command: ContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Jelaskan Kode Ini")
    .setType(ApplicationCommandType.Message),
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.isMessageContextMenuCommand()) {
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

    const code = interaction.targetMessage.content;
    if (!code.trim()) {
      await interaction.reply({
        embeds: [errorEmbed("Pesan ini tidak berisi teks/kode untuk dijelaskan.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await aiExplainCode(interaction.guildId, interaction.user.id, code);
    if (!result.ok || !result.content) {
      await interaction.editReply({
        embeds: [errorEmbed(result.error ?? "Gagal memproses permintaan AI.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🧠 Penjelasan Kode")
          .setDescription(result.content.slice(0, 4000)),
      ],
    });
  },
};

export default command;
