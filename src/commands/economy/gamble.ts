import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Tebak koin — menang: taruhan digandakan, kalah: hangus.")
    .addIntegerOption((opt) =>
      opt
        .setName("taruhan")
        .setDescription("Jumlah koin taruhan.")
        .setRequired(true)
        .setMinValue(10),
    )
    .addStringOption((opt) =>
      opt
        .setName("pilihan")
        .setDescription("Tebakanmu.")
        .setRequired(true)
        .addChoices({ name: "🙂 Kepala", value: "kepala" }, { name: "🪙 Ekor", value: "ekor" }),
    ),
  category: "economy",
  cooldownSeconds: 4,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const bet = interaction.options.getInteger("taruhan", true);
    const pick = interaction.options.getString("pilihan", true);
    const symbol = await getCurrencySymbol(interaction.guildId);

    const debit = await adjustWallet(interaction.guildId, interaction.user.id, -bet);
    if (!debit.success) {
      await interaction.reply({
        embeds: [errorEmbed("Saldo wallet-mu tidak cukup.")],
        ephemeral: true,
      });
      return;
    }

    const outcome = Math.random() < 0.5 ? "kepala" : "ekor";
    const won = outcome === pick;
    const face = outcome === "kepala" ? "🙂 Kepala" : "🪙 Ekor";

    if (won) {
      const payout = bet * 2;
      await adjustWallet(interaction.guildId, interaction.user.id, payout);
      await interaction.reply({
        embeds: [
          buildEmbed("success").setDescription(
            `Koin jatuh di **${face}** — kamu **MENANG**! 🎉\nDapat **${symbol} ${payout.toLocaleString("id-ID")}** (untung ${symbol} ${bet.toLocaleString("id-ID")}).`,
          ),
        ],
      });
      return;
    }

    await interaction.reply({
      embeds: [
        buildEmbed("danger").setDescription(
          `Koin jatuh di **${face}** — kamu **kalah**. 😢\nKehilangan **${symbol} ${bet.toLocaleString("id-ID")}**.`,
        ),
      ],
    });
  },
};

export default command;
