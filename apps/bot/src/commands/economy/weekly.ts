import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, addBalance, canClaimWeekly, WEEKLY_REWARD, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder().setName("weekly").setDescription("Claim your weekly coin reward") as SlashCommandBuilder,
  cooldownSeconds: 5,

  async execute(interaction) {
    if (!interaction.guild) return;
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    if (!canClaimWeekly(profile.lastWeekly)) {
      const nextClaim = new Date(profile.lastWeekly!.getTime() + 7 * 24 * 60 * 60 * 1000);
      await interaction.reply({
        content: `You've already claimed your weekly reward. Come back <t:${Math.floor(nextClaim.getTime() / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const updated = await addBalance(profile.id, WEEKLY_REWARD, TransactionType.WEEKLY, "Weekly reward");
    await prisma.economyProfile.update({ where: { id: profile.id }, data: { lastWeekly: new Date() } });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.WEEKLY, WEEKLY_REWARD, updated.wallet);

    await interaction.reply(`You claimed your weekly reward of **${WEEKLY_REWARD.toString()}** coins!`);
  },
};

export default command;
