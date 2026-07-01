import type { ButtonComponent } from "../../types/component";
import { clearDraft } from "../../services/ktp/ktpSession";
import { warningEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "ktp:cancel",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    await clearDraft(interaction.guildId, interaction.user.id);

    await interaction.update({
      embeds: [warningEmbed("Pembuatan KTP digital dibatalkan.")],
      components: [],
    });
  },
};

export default component;
