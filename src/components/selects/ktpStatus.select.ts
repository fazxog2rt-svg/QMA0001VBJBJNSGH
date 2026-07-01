import type { SelectMenuComponent } from "../../types/component";
import { saveDraft } from "../../services/ktp/ktpSession";
import { buildDraftReviewEmbed } from "../../services/ktp/ktpDraftEmbed";
import { buildReviewComponents } from "../../services/ktp/ktpReviewComponents";
import type { StatusPerkawinan } from "../../services/ktp/ktpOptions";

const component: SelectMenuComponent = {
  customId: "ktp:select-status",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const statusPerkawinan = interaction.values[0]! as StatusPerkawinan;
    const draft = await saveDraft(interaction.guildId, interaction.user.id, { statusPerkawinan });

    await interaction.update({
      embeds: [buildDraftReviewEmbed(draft)],
      components: buildReviewComponents(draft),
    });
  },
};

export default component;
