import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import {
  buildBlackjackEmbed,
  endGame,
  getGame,
  isBlackjack,
  payoutAmount,
  resolve,
  startGame,
} from "../../services/economy/blackjackService";
import { errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Main blackjack (21) lawan dealer, pakai taruhan koin.")
    .addIntegerOption((o) =>
      o.setName("taruhan").setDescription("Jumlah koin taruhan.").setRequired(true).setMinValue(10),
    ),
  category: "economy",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    if (getGame(interaction.guildId, interaction.user.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu masih punya game blackjack yang berjalan. Selesaikan dulu.")],
        ephemeral: true,
      });
      return;
    }

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

    const game = startGame(interaction.guildId, interaction.user.id, bet);

    // Blackjack langsung di kartu awal → selesai instan.
    if (isBlackjack(game.player)) {
      const outcome = resolve(game);
      const credit = payoutAmount(outcome, bet);
      if (credit > 0) await adjustWallet(interaction.guildId, interaction.user.id, credit);
      endGame(interaction.guildId, interaction.user.id);
      await interaction.reply({
        embeds: [
          buildBlackjackEmbed(game, symbol, true).setDescription(
            outcome === "seri"
              ? "🤝 Sama-sama Blackjack! Taruhan dikembalikan."
              : `🃏 **BLACKJACK!** Kamu menang **${symbol} ${credit.toLocaleString("id-ID")}**!`,
          ),
        ],
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`bj:hit:${interaction.user.id}`)
        .setLabel("Hit")
        .setEmoji("🃏")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bj:stand:${interaction.user.id}`)
        .setLabel("Stand")
        .setEmoji("✋")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [buildBlackjackEmbed(game, symbol, false)],
      components: [row],
    });
  },
};

export default command;
