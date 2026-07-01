import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { prisma, ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";

const RULE_TYPES = ["spam", "link", "invite", "mention", "scam", "phishing", "token_grabber"] as const;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure AutoMod rules for this server")
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Enable an AutoMod rule type")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Rule type")
            .setRequired(true)
            .addChoices(...RULE_TYPES.map((t) => ({ name: t, value: t }))),
        )
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Action to take when triggered")
            .setRequired(false)
            .addChoices(
              { name: "WARN", value: ModerationAction.WARN },
              { name: "TIMEOUT", value: ModerationAction.TIMEOUT },
              { name: "KICK", value: ModerationAction.KICK },
              { name: "BAN", value: ModerationAction.BAN },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Disable an AutoMod rule type")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Rule type")
            .setRequired(true)
            .addChoices(...RULE_TYPES.map((t) => ({ name: t, value: t }))),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List configured AutoMod rules"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "enable") {
      const type = interaction.options.getString("type", true);
      const action = (interaction.options.getString("action") as ModerationAction | null) ?? ModerationAction.WARN;

      const existing = await prisma.autoModRule.findFirst({ where: { guildId: interaction.guild.id, type } });
      if (existing) {
        await prisma.autoModRule.update({ where: { id: existing.id }, data: { enabled: true, action } });
      } else {
        await prisma.autoModRule.create({
          data: { guildId: interaction.guild.id, name: `${type} filter`, type, enabled: true, action },
        });
      }

      await interaction.reply({ content: `AutoMod rule **${type}** enabled (action: ${action}).`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "disable") {
      const type = interaction.options.getString("type", true);
      await prisma.autoModRule.updateMany({ where: { guildId: interaction.guild.id, type }, data: { enabled: false } });
      await interaction.reply({ content: `AutoMod rule **${type}** disabled.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "list") {
      const rules = await prisma.autoModRule.findMany({ where: { guildId: interaction.guild.id } });
      if (rules.length === 0) {
        await interaction.reply({ content: "No AutoMod rules configured yet.", flags: MessageFlags.Ephemeral });
        return;
      }
      const lines = rules.map((r) => `**${r.type}** — ${r.enabled ? "enabled" : "disabled"} (action: ${r.action})`);
      await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
