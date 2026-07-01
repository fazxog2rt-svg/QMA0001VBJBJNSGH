import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Lihat saldo wallet dan bank.")
    .addUserOption((option) => option.setName("user").setDescription("Lihat saldo member lain.")),
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

    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = await getOrCreateMember(interaction.guildId, target.id);
    const symbol = await getCurrencySymbol(interaction.guildId);

    await interaction.reply({
      embeds: [
        buildEmbed("premium")
          .setTitle(`${symbol} Saldo ${target.username}`)
          .addFields(
            {
              name: "Wallet",
              value: `${symbol} ${member.walletBalance.toLocaleString("id-ID")}`,
              inline: true,
            },
            {
              name: "Bank",
              value: `${symbol} ${member.bankBalance.toLocaleString("id-ID")}`,
              inline: true,
            },
            {
              name: "Total",
              value: `${symbol} ${(member.walletBalance + member.bankBalance).toLocaleString("id-ID")}`,
              inline: true,
            },
          ),
      ],
    });
  },
};

export default command;
