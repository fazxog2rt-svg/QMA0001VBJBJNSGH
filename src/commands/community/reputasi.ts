import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { giveReputation } from "../../services/community/reputationService";
import { formatDurationMs } from "../../utils/formatDuration";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reputasi")
    .setDescription("Berikan reputasi ke member lain.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang diberi reputasi.").setRequired(true),
    ),
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

    const target = interaction.options.getUser("user", true);
    if (target.bot) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa memberi reputasi ke bot.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const result = await giveReputation(interaction.guildId, interaction.user.id, target.id);

    if (!result.success) {
      if (result.reason === "self") {
        await interaction.editReply({
          embeds: [errorEmbed("Kamu tidak bisa memberi reputasi ke diri sendiri.")],
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          errorEmbed(
            `Kamu bisa memberi reputasi lagi dalam **${formatDurationMs(result.nextGiveInMs!)}**.`,
          ),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed(`⭐ <@${target.id}> sekarang punya **${result.newReputation} reputasi**!`),
      ],
    });
  },
};

export default command;
