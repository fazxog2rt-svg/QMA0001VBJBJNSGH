import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder().setName("inventory").setDescription("View your inventory of purchased items") as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    const entries = await prisma.inventoryItem.findMany({
      where: { profileId: profile.id },
      include: { item: true },
      orderBy: { acquiredAt: "desc" },
    });

    if (entries.length === 0) {
      await interaction.reply({ content: "Your inventory is empty. Visit `/shop` to buy something!", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Inventory`)
      .setColor(0xeb459e)
      .setDescription(entries.map((e) => `${e.item.emoji ?? "🔹"} **${e.item.name}** x${e.quantity}`).join("\n"));

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
