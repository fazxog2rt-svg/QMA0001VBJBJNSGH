import type { SelectMenuComponent } from "../../types/component";
import { saveDraft } from "../../services/ktp/ktpSession";
import { buildDraftReviewEmbed } from "../../services/ktp/ktpDraftEmbed";
import { buildReviewComponents } from "../../services/ktp/ktpReviewComponents";

const component: SelectMenuComponent = {
  customId: "ktp:select-jeniskelamin",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const jenisKelamin = interaction.values[0] as "Laki-laki" | "Perempuan";
    const draft = await saveDraft(interaction.guildId, interaction.user.id, { jenisKelamin });

    await interaction.update({
      embeds: [buildDraftReviewEmbed(draft)],
      components: buildReviewComponents(draft),
    });
  },
};

export default component;
