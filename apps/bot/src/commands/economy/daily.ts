import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, addBalance, canClaimDaily, isStreakContinued, computeDailyReward, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily coin reward") as SlashCommandBuilder,
  cooldownSeconds: 5,

  async execute(interaction) {
    if (!interaction.guild) return;
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    if (!canClaimDaily(profile.lastDaily)) {
      const nextClaim = new Date(profile.lastDaily!.getTime() + 24 * 60 * 60 * 1000);
      await interaction.reply({
        content: `You've already claimed your daily reward. Come back <t:${Math.floor(nextClaim.getTime() / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const streakContinues = isStreakContinued(profile.lastDaily);
    const newStreak = streakContinues ? profile.dailyStreak + 1 : 1;
    const reward = computeDailyReward(newStreak);

    const updated = await addBalance(profile.id, reward, TransactionType.DAILY, `Daily reward (streak ${newStreak})`);
    await prisma.economyProfile.update({ where: { id: profile.id }, data: { lastDaily: new Date(), dailyStreak: newStreak } });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.DAILY, reward, updated.wallet);

    await interaction.reply(
      `You claimed your daily reward of **${reward.toString()}** coins! Current streak: **${newStreak}** day(s).`,
    );
  },
};

export default command;
