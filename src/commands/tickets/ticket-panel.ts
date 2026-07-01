import {
  ActionRowBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildTicketPanelEmbed } from "../../services/tickets/ticketService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("[Admin] Kirim panel pembuatan tiket ke channel ini.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  category: "tickets",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!guildConfig?.tickets?.categoryChannelId) {
      await interaction.reply({
        embeds: [
          errorEmbed("Atur kategori channel tiket dulu dengan `/ticket-config kategori-channel`."),
        ],
        ephemeral: true,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("ticket:open-select")
      .setPlaceholder("Pilih kategori tiket")
      .addOptions(
        guildConfig.tickets.ticketTypes.map((type) => ({
          label: type.label,
          value: type.key,
          emoji: type.emoji,
        })),
      );

    await interaction.channel.send({
      embeds: [buildTicketPanelEmbed(interaction.guild.name)],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });

    await interaction.reply({
      embeds: [successEmbed("Panel tiket berhasil dikirim!")],
      ephemeral: true,
    });
  },
};

export default command;
