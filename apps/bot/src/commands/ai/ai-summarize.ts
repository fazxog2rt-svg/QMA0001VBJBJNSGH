import { SlashCommandBuilder, MessageFlags, ChannelType } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { aiProvider } from "../../lib/ai/provider";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-summarize")
    .setDescription("Summarize recent messages in this channel using AI")
    .addIntegerOption((opt) => opt.setName("count").setDescription("How many recent messages to summarize (max 100)").setMinValue(5).setMaxValue(100).setRequired(false)) as SlashCommandBuilder,
  cooldownSeconds: 15,

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } });
    if (settings && !settings.aiAssistantEnabled) {
      await interaction.reply({ content: "The AI assistant is disabled on this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();
    const count = interaction.options.getInteger("count") ?? 50;

    const messages = await interaction.channel.messages.fetch({ limit: count });
    const transcript = [...messages.values()]
      .reverse()
      .filter((m) => !m.author.bot && m.content.trim().length > 0)
      .map((m) => `${m.author.username}: ${m.content}`)
      .join("\n")
      .slice(0, 12000);

    if (!transcript) {
      await interaction.editReply("Not enough recent message content to summarize.");
      return;
    }

    const result = await aiProvider.complete(
      `Summarize the following Discord channel conversation into a short set of bullet points capturing the key topics and decisions:\n\n${transcript}`,
      { system: "You are a precise, neutral conversation summarizer.", maxTokens: 500 },
    );

    await prisma.aiChatLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        prompt: transcript.slice(0, 4000),
        response: result.text,
        feature: "summarizer",
        tokensUsed: result.tokensUsed,
      },
    });

    await interaction.editReply(result.text.slice(0, 2000));
  },
};

export default command;
