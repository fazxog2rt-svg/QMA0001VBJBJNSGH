import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import { xpForLevel } from "@nexusbot/shared";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your (or another member's) level and XP progress")
    .addUserOption((opt) => opt.setName("target").setDescription("Member to check").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target") ?? interaction.user;

    const member = await prisma.guildMember.upsert({
      where: { guildId_discordUserId: { guildId: interaction.guild.id, discordUserId: target.id } },
      update: {},
      create: { guildId: interaction.guild.id, discordUserId: target.id, username: target.username, avatarUrl: target.displayAvatarURL() },
    });

    const xpIntoLevel = member.xp - xpTotalForLevels(member.level);
    const xpNeeded = xpForLevel(member.level);

    const rankPosition = await prisma.guildMember.count({
      where: { guildId: interaction.guild.id, xp: { gt: member.xp } },
    });

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}'s Rank`)
      .setColor(0x5865f2)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Rank", value: `#${rankPosition + 1}`, inline: true },
        { name: "Level", value: `${member.level}`, inline: true },
        { name: "XP", value: `${xpIntoLevel} / ${xpNeeded}`, inline: true },
        { name: "Messages", value: `${member.messageCount}`, inline: true },
        { name: "Voice Minutes", value: `${member.voiceMinutes}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};

function xpTotalForLevels(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

export default command;
