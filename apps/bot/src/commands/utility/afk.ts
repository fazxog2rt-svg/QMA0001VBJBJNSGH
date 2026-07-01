import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status; NexusBot will notify others who mention you")
    .addStringOption((opt) => opt.setName("reason").setDescription("Why are you AFK?").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction, client) {
    if (!interaction.guild) return;
    const reason = interaction.options.getString("reason") ?? "AFK";

    client.afkUsers.set(`${interaction.guild.id}:${interaction.user.id}`, { reason, since: new Date() });

    await interaction.reply({ content: `You are now marked as AFK: ${reason}`, flags: MessageFlags.Ephemeral });
  },
};

export default command;
