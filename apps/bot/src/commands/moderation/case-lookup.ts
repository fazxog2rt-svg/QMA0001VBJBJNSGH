import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { getCaseByNumber } from "../../features/moderation/caseService";
import { prisma } from "@nexusbot/database";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("case-lookup")
    .setDescription("Look up a moderation case by number, or list recent cases for a user")
    .addIntegerOption((opt) => opt.setName("case_number").setDescription("The case number to look up").setRequired(false))
    .addUserOption((opt) => opt.setName("target").setDescription("List recent cases for this user").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const caseNumber = interaction.options.getInteger("case_number");
    const target = interaction.options.getUser("target");

    if (caseNumber) {
      const moderationCase = await getCaseByNumber(interaction.guild.id, caseNumber);
      if (!moderationCase) {
        await interaction.reply({ content: `Case #${caseNumber} not found.`, flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Case #${moderationCase.caseNumber} — ${moderationCase.action}`)
        .addFields(
          { name: "Target", value: moderationCase.targetTag, inline: true },
          { name: "Moderator", value: moderationCase.moderatorTag, inline: true },
          { name: "Active", value: moderationCase.active ? "Yes" : "No", inline: true },
          { name: "Reason", value: moderationCase.reason ?? "No reason provided" },
        )
        .setTimestamp(moderationCase.createdAt)
        .setColor(0x5865f2);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (target) {
      const cases = await prisma.moderationCase.findMany({
        where: { guildId: interaction.guild.id, targetId: target.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (cases.length === 0) {
        await interaction.reply({ content: `No moderation cases found for ${target.tag}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = cases.map((c) => `#${c.caseNumber} — **${c.action}** by ${c.moderatorTag} — ${c.reason ?? "no reason"}`);
      await interaction.reply({
        content: `Recent cases for ${target.tag}:\n${lines.join("\n")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({ content: "Provide either a case_number or a target user.", flags: MessageFlags.Ephemeral });
  },
};

export default command;
