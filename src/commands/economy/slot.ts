import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const REELS = ["🍒", "🍋", "🍊", "🍉", "⭐", "💎", "7️⃣"];

// Pengganda kemenangan berdasarkan pola simbol.
const JACKPOT_MULTIPLIER = 10; // 3 sama, khusus 💎/7️⃣
const TRIPLE_MULTIPLIER = 5; // 3 sama lainnya
const DOUBLE_MULTIPLIER = 2; // 2 sama

function spin(): string[] {
  return [0, 1, 2].map(() => REELS[Math.floor(Math.random() * REELS.length)]!);
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("Mesin slot — pertaruhkan koinmu!")
    .addIntegerOption((opt) =>
      opt
        .setName("taruhan")
        .setDescription("Jumlah koin taruhan.")
        .setRequired(true)
        .setMinValue(10),
    ),
  category: "economy",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const bet = interaction.options.getInteger("taruhan", true);
    const symbol = await getCurrencySymbol(interaction.guildId);

    const debit = await adjustWallet(interaction.guildId, interaction.user.id, -bet);
    if (!debit.success) {
      await interaction.reply({
        embeds: [errorEmbed("Saldo wallet-mu tidak cukup.")],
        ephemeral: true,
      });
      return;
    }

    const result = spin();
    const [a, b, c] = result;
    let multiplier = 0;
    if (a === b && b === c) {
      multiplier = a === "💎" || a === "7️⃣" ? JACKPOT_MULTIPLIER : TRIPLE_MULTIPLIER;
    } else if (a === b || b === c || a === c) {
      multiplier = DOUBLE_MULTIPLIER;
    }

    const payout = bet * multiplier;
    if (payout > 0) {
      await adjustWallet(interaction.guildId, interaction.user.id, payout);
    }

    const net = payout - bet;
    const line = `『 ${result.join(" | ")} 』`;
    const embed =
      payout > 0
        ? buildEmbed("success").setDescription(
            `🎰 ${line}\n\n**MENANG!** ${multiplier}x — kamu dapat **${symbol} ${payout.toLocaleString("id-ID")}** (untung ${symbol} ${net.toLocaleString("id-ID")}).`,
          )
        : buildEmbed("danger").setDescription(
            `🎰 ${line}\n\n**Kalah!** Kamu kehilangan **${symbol} ${bet.toLocaleString("id-ID")}**. Coba lagi!`,
          );

    await interaction.reply({ embeds: [embed.setTitle("Mesin Slot")] });
  },
};

export default command;
