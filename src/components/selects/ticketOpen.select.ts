import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { createTicket, buildTicketWelcomeEmbed } from "../../services/tickets/ticketService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: SelectMenuComponent = {
  customId: "ticket:open-select",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const categoryKey = interaction.values[0]!;
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const ticketType = guildConfig?.tickets?.ticketTypes.find((type) => type.key === categoryKey);
    const categoryLabel = ticketType?.label ?? categoryKey;

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const result = await createTicket(interaction.guild, member, categoryKey, categoryLabel);

    if ("error" in result) {
      await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket:claim")
        .setLabel("Klaim")
        .setEmoji("🙋")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("ticket:close")
        .setLabel("Tutup")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
    );

    const channel = interaction.guild.channels.cache.get(result.channelId);
    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [buildTicketWelcomeEmbed(result.ticket, interaction.user.id)],
        components: [row],
      });
    }

    await interaction.editReply({
      embeds: [successEmbed(`Tiketmu telah dibuat: <#${result.channelId}>`)],
    });
  },
};

export default component;
