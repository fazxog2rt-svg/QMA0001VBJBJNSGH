import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder().setName("shop").setDescription("View items available for purchase in this server") as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const items = await prisma.item.findMany({ where: { guildId: interaction.guild.id }, orderBy: { price: "asc" }, take: 25 });

    if (items.length === 0) {
      await interaction.reply({ content: "This server's shop is empty. Ask an admin to add items.", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} Shop`)
      .setColor(0xfee75c)
      .setDescription(
        items
          .map((item) => `${item.emoji ?? "🔹"} **${item.name}** — ${item.price.toString()} coins${item.description ? `\n${item.description}` : ""}`)
          .join("\n\n"),
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
