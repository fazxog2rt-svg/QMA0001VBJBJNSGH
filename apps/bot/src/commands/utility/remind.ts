import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

function parseDuration(input: string): number | null {
  const match = /^(\d+)(m|h|d)$/i.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return value * multiplier;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((opt) => opt.setName("when").setDescription("Duration, e.g. 30m, 2h, 1d").setRequired(true))
    .addStringOption((opt) => opt.setName("message").setDescription("What to remind you about").setRequired(true)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const when = interaction.options.getString("when", true);
    const message = interaction.options.getString("message", true);

    const durationMs = parseDuration(when);
    if (!durationMs) {
      await interaction.reply({ content: "Invalid duration. Use formats like `30m`, `2h`, or `1d`.", flags: MessageFlags.Ephemeral });
      return;
    }

    const remindAt = new Date(Date.now() + durationMs);

    await prisma.reminder.create({
      data: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        content: message,
        remindAt,
      },
    });

    await interaction.reply({
      content: `I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>: "${message}"`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
