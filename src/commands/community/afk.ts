import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { setAfk } from "../../services/community/afkService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Tandai dirimu sedang AFK.")
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan AFK (opsional).").setMaxLength(200),
    ),
  category: "community",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan.";
    await setAfk(interaction.guildId, interaction.user.id, alasan);

    await interaction.reply({
      embeds: [buildEmbed("info").setDescription(`💤 ${interaction.user} sekarang AFK: ${alasan}`)],
    });
  },
};

export default command;
