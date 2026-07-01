import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { claimWeekly, getCurrencySymbol } from "../../services/economy/economyService";
import { formatDurationMs } from "../../utils/formatDuration";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("weekly").setDescription("Klaim reward mingguan."),
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

    await interaction.deferReply();
    const result = await claimWeekly(interaction.guildId, interaction.user.id);

    if (!result.claimed) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            `Kamu sudah klaim weekly. Coba lagi dalam **${formatDurationMs(result.nextClaimInMs!)}**.`,
          ),
        ],
      });
      return;
    }

    const symbol = await getCurrencySymbol(interaction.guildId);
    await interaction.editReply({
      embeds: [
        buildEmbed("success").setDescription(
          `🎁 Kamu mendapatkan **${symbol} ${result.amount.toLocaleString("id-ID")}** dari reward mingguan!`,
        ),
      ],
    });
  },
};

export default command;
