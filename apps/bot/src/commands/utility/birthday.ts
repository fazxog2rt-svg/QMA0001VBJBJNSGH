import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Set your birthday so the server can celebrate with you")
    .addIntegerOption((opt) => opt.setName("month").setDescription("Month (1-12)").setRequired(true).setMinValue(1).setMaxValue(12))
    .addIntegerOption((opt) => opt.setName("day").setDescription("Day (1-31)").setRequired(true).setMinValue(1).setMaxValue(31))
    .addIntegerOption((opt) => opt.setName("year").setDescription("Year (optional)").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const month = interaction.options.getInteger("month", true);
    const day = interaction.options.getInteger("day", true);
    const year = interaction.options.getInteger("year") ?? undefined;

    await prisma.birthday.upsert({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } },
      update: { month, day, year },
      create: { guildId: interaction.guild.id, userId: interaction.user.id, month, day, year },
    });

    await interaction.reply({
      content: `Your birthday has been set to ${month}/${day}${year ? `/${year}` : ""}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
