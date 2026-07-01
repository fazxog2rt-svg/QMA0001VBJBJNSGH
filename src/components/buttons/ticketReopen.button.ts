import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Ticket } from "../../database/models/Ticket";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "ticket:reopen",
  execute: async (interaction) => {
    if (
      !interaction.inGuild() ||
      !interaction.guild ||
      interaction.channel?.type !== ChannelType.GuildText
    )
      return;

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isSupport = guildConfig?.tickets?.supportRoleIds.some((roleId) =>
      member.roles.cache.has(roleId),
    );
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (!isSupport && !hasManageGuild) {
      await interaction.reply({
        embeds: [errorEmbed("Hanya tim support yang bisa membuka kembali tiket.")],
        ephemeral: true,
      });
      return;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId, status: "closed" },
      { status: "reopened" },
      { new: true },
    );

    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("Tiket ini belum ditutup atau tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.channel.permissionOverwrites
      .edit(ticket.openedBy, { SendMessages: true })
      .catch(() => undefined);
    await interaction.reply({
      embeds: [successEmbed(`🔓 Tiket dibuka kembali oleh ${interaction.user}.`)],
    });
  },
};

export default component;
