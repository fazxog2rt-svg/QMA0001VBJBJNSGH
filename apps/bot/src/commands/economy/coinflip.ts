import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { TransactionType } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { getOrCreateProfile, addBalance, publishEconomyTransaction } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Bet coins on a coin flip (50/50 odds)")
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to bet").setRequired(true).setMinValue(1))
    .addStringOption((opt) =>
      opt
        .setName("call")
        .setDescription("Heads or tails")
        .setRequired(true)
        .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" }),
    ) as SlashCommandBuilder,
  cooldownSeconds: 5,

  async execute(interaction) {
    if (!interaction.guild) return;
    const amount = BigInt(interaction.options.getInteger("amount", true));
    const call = interaction.options.getString("call", true);

    const profile = await getOrCreateProfile(interaction.guild.id, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL());
    if (profile.wallet < amount) {
      await interaction.reply({ content: "You don't have enough coins for that bet.", flags: MessageFlags.Ephemeral });
      return;
    }

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === call;
    const delta = won ? amount : -amount;

    const updated = await addBalance(profile.id, delta, TransactionType.GAMBLE, `Coinflip ${won ? "win" : "loss"} (called ${call}, landed ${result})`);
    await publishEconomyTransaction(interaction.guild.id, interaction.user.id, TransactionType.GAMBLE, delta, updated.wallet);

    await interaction.reply(
      `The coin landed on **${result}**! You ${won ? `won **${amount.toString()}**` : `lost **${amount.toString()}**`} coins.`,
    );
  },
};

export default command;
