import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const CHOICES = {
  batu: { emoji: "✊", beats: "gunting" },
  gunting: { emoji: "✌️", beats: "kertas" },
  kertas: { emoji: "✋", beats: "batu" },
} as const;

type Choice = keyof typeof CHOICES;
const CHOICE_KEYS = Object.keys(CHOICES) as Choice[];

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("suit")
    .setDescription("Suit (batu-gunting-kertas) lawan bot, bisa pakai taruhan.")
    .addStringOption((opt) =>
      opt
        .setName("pilihan")
        .setDescription("Pilihanmu.")
        .setRequired(true)
        .addChoices(
          { name: "✊ Batu", value: "batu" },
          { name: "✌️ Gunting", value: "gunting" },
          { name: "✋ Kertas", value: "kertas" },
        ),
    )
    .addIntegerOption((opt) =>
      opt.setName("taruhan").setDescription("Taruhan koin (opsional).").setMinValue(10),
    ),
  category: "fun",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const player = interaction.options.getString("pilihan", true) as Choice;
    const bet = interaction.options.getInteger("taruhan") ?? 0;
    const botPick = CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)]!;

    if (bet > 0) {
      const debit = await adjustWallet(interaction.guildId, interaction.user.id, -bet);
      if (!debit.success) {
        await interaction.reply({
          embeds: [errorEmbed("Saldo wallet-mu tidak cukup untuk taruhan itu.")],
          ephemeral: true,
        });
        return;
      }
    }

    const head = `${CHOICES[player].emoji} **${player}** vs **${botPick}** ${CHOICES[botPick].emoji}`;

    let outcome: "menang" | "kalah" | "seri";
    if (player === botPick) outcome = "seri";
    else if (CHOICES[player].beats === botPick) outcome = "menang";
    else outcome = "kalah";

    const symbol = bet > 0 ? await getCurrencySymbol(interaction.guildId) : "";

    if (outcome === "seri") {
      if (bet > 0) await adjustWallet(interaction.guildId, interaction.user.id, bet); // kembalikan
      await interaction.reply({
        embeds: [
          buildEmbed("warning").setDescription(
            `${head}\n\n🤝 **Seri!**${bet > 0 ? " Taruhan dikembalikan." : ""}`,
          ),
        ],
      });
      return;
    }

    if (outcome === "menang") {
      let extra = "";
      if (bet > 0) {
        await adjustWallet(interaction.guildId, interaction.user.id, bet * 2);
        extra = `\nKamu dapat **${symbol} ${(bet * 2).toLocaleString("id-ID")}**.`;
      }
      await interaction.reply({
        embeds: [buildEmbed("success").setDescription(`${head}\n\n🎉 Kamu **MENANG**!${extra}`)],
      });
      return;
    }

    await interaction.reply({
      embeds: [
        buildEmbed("danger").setDescription(
          `${head}\n\n😢 Kamu **kalah**.${bet > 0 ? ` Kehilangan **${symbol} ${bet.toLocaleString("id-ID")}**.` : ""}`,
        ),
      ],
    });
  },
};

export default command;
