import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Move coins from your wallet to your bank")
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to deposit").setRequired(true).setMinValue(1)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const amount = BigInt(interaction.options.getInteger("amount", true));
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    if (profile.wallet < amount) {
      await interaction.reply({ content: "You don't have that much in your wallet.", flags: MessageFlags.Ephemeral });
      return;
    }
    const availableCapacity = profile.bankCapacity - profile.bank;
    if (amount > availableCapacity) {
      await interaction.reply({ content: `Your bank can only hold ${availableCapacity.toString()} more coins.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.economyProfile.update({
        where: { id: profile.id },
        data: { wallet: { decrement: amount }, bank: { increment: amount } },
      });
      await tx.transaction.create({
        data: { profileId: profile.id, type: TransactionType.TRANSFER, amount: -amount, balanceAfter: result.wallet, note: "Deposit to bank" },
      });
      return result;
    });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.TRANSFER, amount, updated.wallet);
    await interaction.reply(`Deposited **${amount.toString()}** coins into your bank.`);
  },
};

export default command;
