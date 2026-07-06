import { type ButtonComponent } from "../../types/component";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import {
  buildBlackjackEmbed,
  dealerPlay,
  endGame,
  getGame,
  handValue,
  hit,
  payoutAmount,
  resolve,
} from "../../services/economy/blackjackService";
import { errorEmbed } from "../../utils/embed";

const RESULT_TEXT = {
  blackjack: "🃏 **BLACKJACK!**",
  menang: "🎉 Kamu **menang**!",
  kalah: "😢 Kamu **kalah**.",
  seri: "🤝 **Seri** — taruhan dikembalikan.",
} as const;

const component: ButtonComponent = {
  customId: "bj:",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const [, action, ownerId] = interaction.customId.split(":");

    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        embeds: [errorEmbed("Ini bukan game blackjack milikmu.")],
        ephemeral: true,
      });
      return;
    }

    const game = getGame(interaction.guildId, interaction.user.id);
    if (!game) {
      await interaction.reply({ embeds: [errorEmbed("Game sudah berakhir.")], ephemeral: true });
      return;
    }

    const symbol = await getCurrencySymbol(interaction.guildId);

    if (action === "hit") {
      hit(game);
      if (handValue(game.player) > 21) {
        // bust — langsung kalah
        endGame(interaction.guildId, interaction.user.id);
        await interaction.update({
          embeds: [
            buildBlackjackEmbed(game, symbol, true).setDescription(
              `💥 **BUST!** Nilaimu ${handValue(game.player)}. ${RESULT_TEXT.kalah}`,
            ),
          ],
          components: [],
        });
        return;
      }
      // lanjut main
      await interaction.update({
        embeds: [buildBlackjackEmbed(game, symbol, false)],
        components: interaction.message.components,
      });
      return;
    }

    // stand
    dealerPlay(game);
    const outcome = resolve(game);
    const credit = payoutAmount(outcome, game.bet);
    if (credit > 0) await adjustWallet(interaction.guildId, interaction.user.id, credit);
    endGame(interaction.guildId, interaction.user.id);

    const netText =
      outcome === "menang" || outcome === "blackjack"
        ? ` (+${symbol} ${(credit - game.bet).toLocaleString("id-ID")})`
        : "";

    await interaction.update({
      embeds: [
        buildBlackjackEmbed(game, symbol, true).setDescription(`${RESULT_TEXT[outcome]}${netText}`),
      ],
      components: [],
    });
  },
};

export default component;
