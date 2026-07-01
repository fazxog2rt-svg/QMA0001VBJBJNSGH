import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { aiProvider } from "../../lib/ai/provider";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-translate")
    .setDescription("Translate text using AI")
    .addStringOption((opt) => opt.setName("text").setDescription("Text to translate").setRequired(true))
    .addStringOption((opt) => opt.setName("target_language").setDescription("Target language, e.g. Spanish, Japanese").setRequired(true)) as SlashCommandBuilder,
  cooldownSeconds: 8,

  async execute(interaction) {
    if (!interaction.guild) return;

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } });
    if (settings && !settings.aiAssistantEnabled) {
      await interaction.reply({ content: "The AI assistant is disabled on this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();
    const text = interaction.options.getString("text", true);
    const targetLanguage = interaction.options.getString("target_language", true);

    const result = await aiProvider.complete(
      `Translate the following text to ${targetLanguage}. Reply with only the translation, no explanation:\n\n${text}`,
      { system: "You are a precise translation engine.", maxTokens: 400 },
    );

    await prisma.aiChatLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        prompt: text,
        response: result.text,
        feature: "translation",
        tokensUsed: result.tokensUsed,
      },
    });

    await interaction.editReply(`**Translation (${targetLanguage}):**\n${result.text.slice(0, 1900)}`);
  },
};

export default command;
