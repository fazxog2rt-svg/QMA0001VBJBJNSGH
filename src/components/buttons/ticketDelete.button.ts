import { PermissionFlagsBits } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { errorEmbed } from "../../utils/embed";
import { askConfirmation } from "../../utils/confirm";

const component: ButtonComponent = {
  customId: "ticket:delete",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel) return;

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isSupport = guildConfig?.tickets?.supportRoleIds.some((roleId) =>
      member.roles.cache.has(roleId),
    );
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (!isSupport && !hasManageGuild) {
      await interaction.reply({
        embeds: [errorEmbed("Hanya tim support yang bisa menghapus channel tiket.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const confirmed = await askConfirmation(
      interaction,
      "Channel tiket ini akan dihapus permanen. Yakin?",
    );
    if (confirmed !== true) {
      await interaction.editReply({
        embeds: [errorEmbed("Penghapusan dibatalkan.")],
        components: [],
      });
      return;
    }

    await interaction.editReply({ content: "Menghapus channel...", embeds: [], components: [] });
    await interaction.channel.delete().catch(() => undefined);
  },
};

export default component;
