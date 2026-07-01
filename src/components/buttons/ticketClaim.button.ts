import { PermissionFlagsBits } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Ticket } from "../../database/models/Ticket";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "ticket:claim",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) return;

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isSupport = guildConfig?.tickets?.supportRoleIds.some((roleId) =>
      member.roles.cache.has(roleId),
    );
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (!isSupport && !hasManageGuild) {
      await interaction.reply({
        embeds: [errorEmbed("Hanya tim support yang bisa mengklaim tiket ini.")],
        ephemeral: true,
      });
      return;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId, status: "open" },
      { status: "claimed", claimedBy: interaction.user.id },
      { new: true },
    );

    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("Tiket ini sudah diklaim atau tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ embeds: [successEmbed(`Tiket diklaim oleh ${interaction.user}.`)] });
  },
};

export default component;
