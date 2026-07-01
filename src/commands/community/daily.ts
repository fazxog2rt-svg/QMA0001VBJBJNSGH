import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { claimDaily } from "../../services/community/dailyService";
import { formatDurationMs } from "../../utils/formatDuration";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Klaim reward harian dan pertahankan streak-mu."),
  category: "community",
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

    const result = await claimDaily(interaction.guildId, interaction.user.id);

    if (!result.claimed) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            `Kamu sudah klaim daily. Coba lagi dalam **${formatDurationMs(result.nextClaimInMs!)}**.`,
          ),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildEmbed("success").setDescription(
          `💰 Kamu mendapatkan **${result.amount} koin**!\n🔥 Daily Streak: **${result.streak} hari**`,
        ),
      ],
    });
  },
};

export default command;
