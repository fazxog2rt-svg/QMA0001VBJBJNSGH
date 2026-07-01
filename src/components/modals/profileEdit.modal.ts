import type { ModalComponent } from "../../types/component";
import { parseSocialMediaText, updateProfile } from "../../services/profile/profileService";
import { successEmbed } from "../../utils/embed";

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const component: ModalComponent = {
  customId: "profile:edit",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const bio = interaction.fields.getTextInputValue("bio").trim();
    const pronouns = interaction.fields.getTextInputValue("pronouns").trim();
    const favoriteColorInput = interaction.fields.getTextInputValue("favoriteColor").trim();
    const socialMediaText = interaction.fields.getTextInputValue("socialMedia").trim();

    const favoriteColor =
      favoriteColorInput && HEX_COLOR_PATTERN.test(favoriteColorInput)
        ? favoriteColorInput.startsWith("#")
          ? favoriteColorInput
          : `#${favoriteColorInput}`
        : "";

    await updateProfile(interaction.guildId, interaction.user.id, {
      bio,
      pronouns,
      favoriteColor,
      socialMedia: parseSocialMediaText(socialMediaText),
    });

    await interaction.reply({
      embeds: [successEmbed("Profil berhasil diperbarui. Gunakan `/profile` untuk melihatnya.")],
      ephemeral: true,
    });
  },
};

export default component;
