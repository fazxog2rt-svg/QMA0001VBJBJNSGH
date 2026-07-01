import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { deposit, getCurrencySymbol, withdraw } from "../../services/economy/economyService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("bank")
    .setDescription("Setor atau tarik koin dari bank.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setor")
        .setDescription("Setor koin dari wallet ke bank.")
        .addIntegerOption((option) =>
          option.setName("jumlah").setDescription("Jumlah koin.").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tarik")
        .setDescription("Tarik koin dari bank ke wallet.")
        .addIntegerOption((option) =>
          option.setName("jumlah").setDescription("Jumlah koin.").setRequired(true).setMinValue(1),
        ),
    ),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const jumlah = interaction.options.getInteger("jumlah", true);
    const symbol = await getCurrencySymbol(interaction.guildId);

    const result =
      subcommand === "setor"
        ? await deposit(interaction.guildId, interaction.user.id, jumlah)
        : await withdraw(interaction.guildId, interaction.user.id, jumlah);

    if (!result.success) {
      await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
      return;
    }

    await interaction.reply({
      embeds: [
        successEmbed(
          subcommand === "setor"
            ? `🏦 Kamu menyetor **${symbol} ${jumlah.toLocaleString("id-ID")}** ke bank.`
            : `🏦 Kamu menarik **${symbol} ${jumlah.toLocaleString("id-ID")}** dari bank.`,
        ),
      ],
    });
  },
};

export default command;
