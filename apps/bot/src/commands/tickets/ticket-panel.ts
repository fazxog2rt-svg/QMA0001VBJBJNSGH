import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Post a panel members can use to open a support ticket")
    .addStringOption((opt) => opt.setName("title").setDescription("Panel title").setRequired(false))
    .addStringOption((opt) => opt.setName("description").setDescription("Panel description").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !("send" in interaction.channel)) return;

    const title = interaction.options.getString("title") ?? "Support";
    const description = interaction.options.getString("description") ?? "Click the button below to open a private support ticket.";

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ticket:open").setLabel("Open Ticket").setStyle(ButtonStyle.Primary).setEmoji("🎫"),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "Ticket panel posted.", flags: MessageFlags.Ephemeral });
  },
};

export default command;
