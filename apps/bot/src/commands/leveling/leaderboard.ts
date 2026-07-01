import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder().setName("xp-leaderboard").setDescription("View the top XP earners in this server") as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;

    const top = await prisma.guildMember.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: { xp: "desc" },
      take: 10,
    });

    if (top.length === 0) {
      await interaction.reply("No leveling data yet for this server.");
      return;
    }

    const lines = top.map((m, i) => `**${i + 1}.** ${m.username} — Level ${m.level} (${m.xp} XP)`);
    const embed = new EmbedBuilder().setTitle(`${interaction.guild.name} XP Leaderboard`).setColor(0x5865f2).setDescription(lines.join("\n"));

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
