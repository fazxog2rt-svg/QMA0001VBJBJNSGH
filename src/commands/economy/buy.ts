import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buyItem } from "../../services/economy/economyService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Beli item dari toko server.")
    .addStringOption((option) =>
      option.setName("key").setDescription("Key item (lihat /shop).").setRequired(true),
    ),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const key = interaction.options.getString("key", true);
    await interaction.deferReply();

    const result = await buyItem(interaction.guildId, interaction.user.id, key);
    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error!)] });
      return;
    }

    // Grant the linked role if the item carries one.
    if (result.roleId) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      await member?.roles
        .add(result.roleId, `Membeli item toko: ${result.itemName}`)
        .catch(() => undefined);
    }

    await interaction.editReply({
      embeds: [
        successEmbed(
          `🛍️ Kamu berhasil membeli **${result.itemName}**!${result.roleId ? ` Role telah diberikan.` : ""}`,
        ),
      ],
    });
  },
};

export default command;
