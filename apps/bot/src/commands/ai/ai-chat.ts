import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { aiProvider } from "../../lib/ai/provider";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-chat")
    .setDescription("Chat with NexusBot's AI assistant")
    .addStringOption((opt) => opt.setName("prompt").setDescription("What do you want to ask?").setRequired(true)) as SlashCommandBuilder,
  cooldownSeconds: 8,

  async execute(interaction) {
    if (!interaction.guild) return;

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } });
    if (settings && !settings.aiAssistantEnabled) {
      await interaction.reply({ content: "The AI assistant is disabled on this server. An admin can enable it in the dashboard.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();
    const prompt = interaction.options.getString("prompt", true);

    const result = await aiProvider.complete(prompt, {
      system: "You are NexusBot, a helpful, concise Discord community assistant.",
    });

    await prisma.aiChatLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        prompt,
        response: result.text,
        feature: "chat",
        tokensUsed: result.tokensUsed,
      },
    });

    await interaction.editReply(result.text.slice(0, 2000));
  },
};

export default command;
