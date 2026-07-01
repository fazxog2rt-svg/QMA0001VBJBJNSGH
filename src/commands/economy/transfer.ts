import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getCurrencySymbol, transferCoins } from "../../services/economy/economyService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("Transfer koin ke member lain.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Penerima transfer.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option.setName("jumlah").setDescription("Jumlah koin.").setRequired(true).setMinValue(1),
    ),
  category: "economy",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const jumlah = interaction.options.getInteger("jumlah", true);

    if (target.bot) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa transfer ke bot.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const result = await transferCoins(interaction.guildId, interaction.user.id, target.id, jumlah);

    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error!)] });
      return;
    }

    const symbol = await getCurrencySymbol(interaction.guildId);

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "economy",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Transfer ${jumlah} koin ke <@${target.id}>`,
    });

    await interaction.editReply({
      embeds: [
        successEmbed(
          `💸 Kamu mentransfer **${symbol} ${jumlah.toLocaleString("id-ID")}** ke <@${target.id}>.`,
        ),
      ],
    });
  },
};

export default command;
