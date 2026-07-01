import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { RealtimeEvent } from "@nexusbot/shared";
import type { Command } from "../../types/command";
import { getOrCreateProfile, transferBalance } from "../../features/economy/service";
import { publishRealtimeEvent } from "../../lib/redis";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Transfer coins to another member")
    .addUserOption((opt) => opt.setName("target").setDescription("Who to pay").setRequired(true))
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to pay").setRequired(true).setMinValue(1)) as SlashCommandBuilder,
  cooldownSeconds: 5,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "You can't pay yourself.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: "You can't pay a bot.", flags: MessageFlags.Ephemeral });
      return;
    }

    const fromProfile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
    const toProfile = await getOrCreateProfile(interaction.guild.id, target.id, target.username, target.displayAvatarURL());

    try {
      const { from, to } = await transferBalance(fromProfile.id, toProfile.id, BigInt(amount), `Payment to ${target.username}`);

      await publishRealtimeEvent(RealtimeEvent.EconomyTransaction, interaction.guild.id, {
        type: "TRANSFER",
        fromUserId: interaction.user.id,
        toUserId: target.id,
        amount: amount.toString(),
        fromBalanceAfter: from.wallet.toString(),
        toBalanceAfter: to.wallet.toString(),
      });

      await interaction.reply(`You paid **${amount}** coins to ${target.username}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
