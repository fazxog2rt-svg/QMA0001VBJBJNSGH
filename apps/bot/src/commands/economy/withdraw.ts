import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Move coins from your bank to your wallet")
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to withdraw").setRequired(true).setMinValue(1)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const amount = BigInt(interaction.options.getInteger("amount", true));
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    if (profile.bank < amount) {
      await interaction.reply({ content: "You don't have that much in your bank.", flags: MessageFlags.Ephemeral });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.economyProfile.update({
        where: { id: profile.id },
        data: { wallet: { increment: amount }, bank: { decrement: amount } },
      });
      await tx.transaction.create({
        data: { profileId: profile.id, type: TransactionType.TRANSFER, amount, balanceAfter: result.wallet, note: "Withdraw from bank" },
      });
      return result;
    });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.TRANSFER, amount, updated.wallet);
    await interaction.reply(`Withdrew **${amount.toString()}** coins from your bank.`);
  },
};

export default command;
