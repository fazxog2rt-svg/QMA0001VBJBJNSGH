import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder().setName("leaderboard").setDescription("View the richest members in this server") as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;

    const members = await prisma.guildMember.findMany({
      where: { guildId: interaction.guild.id, economy: { isNot: null } },
      include: { economy: true },
    });

    const ranked = members
      .filter((m) => m.economy)
      .sort((a, b) => {
        const totalA = a.economy!.wallet + a.economy!.bank;
        const totalB = b.economy!.wallet + b.economy!.bank;
        return totalB > totalA ? 1 : totalB < totalA ? -1 : 0;
      })
      .slice(0, 10);

    if (ranked.length === 0) {
      await interaction.reply("No economy data yet for this server.");
      return;
    }

    const lines = ranked.map((m, i) => {
      const total = m.economy!.wallet + m.economy!.bank;
      return `**${i + 1}.** ${m.username} — ${total.toString()} coins`;
    });

    const embed = new EmbedBuilder().setTitle(`${interaction.guild.name} Economy Leaderboard`).setColor(0xf1c40f).setDescription(lines.join("\n"));

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
