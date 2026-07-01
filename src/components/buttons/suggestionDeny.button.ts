import { PermissionFlagsBits } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { Suggestion } from "../../database/models/Suggestion";
import { errorEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "suggestion:deny",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    if (!hasManageGuild) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu butuh izin **Manage Server**.")],
        ephemeral: true,
      });
      return;
    }

    const suggestion = await Suggestion.findOneAndUpdate(
      { messageId: interaction.message.id },
      { status: "denied", reviewedBy: interaction.user.id },
      { new: true },
    );

    if (!suggestion) {
      await interaction.reply({
        embeds: [errorEmbed("Data saran tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    const embed = interaction.message.embeds[0];
    const updatedEmbed = embed
      ? {
          ...embed.data,
          fields: [{ name: "Status", value: `❌ Ditolak oleh ${interaction.user.tag}` }],
        }
      : undefined;

    await interaction.update({ embeds: updatedEmbed ? [updatedEmbed] : [], components: [] });
  },
};

export default component;
