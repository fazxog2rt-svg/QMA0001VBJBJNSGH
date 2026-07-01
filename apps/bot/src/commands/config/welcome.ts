import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome/goodbye messages")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Configure the welcome message")
        .addChannelOption((opt) => opt.setName("channel").setDescription("Welcome channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((opt) => opt.setName("message").setDescription("Use {user}, {server}, {memberCount}").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("goodbye")
        .setDescription("Configure the goodbye message")
        .addChannelOption((opt) => opt.setName("channel").setDescription("Goodbye channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((opt) => opt.setName("message").setDescription("Use {user}, {server}, {memberCount}").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("autorole")
        .setDescription("Add a role to auto-assign on member join")
        .addRoleOption((opt) => opt.setName("role").setDescription("Role to auto-assign").setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();

    await prisma.guildSettings.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });

    if (sub === "set") {
      const channel = interaction.options.getChannel("channel", true);
      const message = interaction.options.getString("message") ?? undefined;
      await prisma.guildSettings.update({
        where: { guildId: interaction.guild.id },
        data: { welcomeChannelId: channel.id, welcomeMessage: message },
      });
      await interaction.reply({ content: `Welcome messages will be sent in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "goodbye") {
      const channel = interaction.options.getChannel("channel", true);
      const message = interaction.options.getString("message") ?? undefined;
      await prisma.guildSettings.update({
        where: { guildId: interaction.guild.id },
        data: { goodbyeChannelId: channel.id, goodbyeMessage: message },
      });
      await interaction.reply({ content: `Goodbye messages will be sent in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "autorole") {
      const role = interaction.options.getRole("role", true);
      const settings = await prisma.guildSettings.findUniqueOrThrow({ where: { guildId: interaction.guild.id } });
      const nextRoles = Array.from(new Set([...settings.autoRoleIds, role.id]));
      await prisma.guildSettings.update({ where: { guildId: interaction.guild.id }, data: { autoRoleIds: nextRoles } });
      await interaction.reply({ content: `${role.name} will now be auto-assigned to new members.`, flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
