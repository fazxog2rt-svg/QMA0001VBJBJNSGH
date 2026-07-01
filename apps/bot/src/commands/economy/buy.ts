import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item from the shop")
    .addStringOption((opt) => opt.setName("item_name").setDescription("Exact name of the item").setRequired(true))
    .addIntegerOption((opt) => opt.setName("quantity").setDescription("How many to buy").setMinValue(1).setRequired(false)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const itemName = interaction.options.getString("item_name", true);
    const quantity = interaction.options.getInteger("quantity") ?? 1;

    const item = await prisma.item.findFirst({ where: { guildId: interaction.guild.id, name: { equals: itemName, mode: "insensitive" } } });
    if (!item) {
      await interaction.reply({ content: `No item named "${itemName}" found in the shop.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
    const totalCost = item.price * BigInt(quantity);

    if (profile.wallet < totalCost) {
      await interaction.reply({ content: `You need ${totalCost.toString()} coins but only have ${profile.wallet.toString()}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      const result = await tx.economyProfile.update({
        where: { id: profile.id },
        data: { wallet: { decrement: totalCost } },
      });

      await tx.transaction.create({
        data: { profileId: profile.id, type: TransactionType.PURCHASE, amount: -totalCost, balanceAfter: result.wallet, note: `Bought ${quantity}x ${item.name}` },
      });

      await tx.inventoryItem.upsert({
        where: { profileId_itemId: { profileId: profile.id, itemId: item.id } },
        update: { quantity: { increment: quantity } },
        create: { profileId: profile.id, itemId: item.id, quantity },
      });

      return result;
    });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.PURCHASE, -totalCost, updatedProfile.wallet);
    await interaction.reply(`You bought **${quantity}x ${item.name}** for ${totalCost.toString()} coins.`);
  },
};

export default command;
