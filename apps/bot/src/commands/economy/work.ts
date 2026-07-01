import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType, prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, addBalance, canWork, rollWork, WORK_COOLDOWN_MINUTES, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder().setName("work").setDescription("Work a random job for coins") as SlashCommandBuilder,
  cooldownSeconds: 5,

  async execute(interaction) {
    if (!interaction.guild) return;
    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());

    if (!canWork(profile.lastWork)) {
      const nextClaim = new Date(profile.lastWork!.getTime() + WORK_COOLDOWN_MINUTES * 60_000);
      await interaction.reply({
        content: `You're tired. You can work again <t:${Math.floor(nextClaim.getTime() / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { title, amount } = rollWork();
    const updated = await addBalance(profile.id, amount, TransactionType.WORK, `Work: ${title}`);
    await prisma.economyProfile.update({ where: { id: profile.id }, data: { lastWork: new Date() } });

    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.WORK, amount, updated.wallet);

    await interaction.reply(`You ${title} and earned **${amount.toString()}** coins!`);
  },
};

export default command;
