import type { SelectMenuComponent } from "../../types/component";
import { saveDraft } from "../../services/ktp/ktpSession";
import { buildDraftReviewEmbed } from "../../services/ktp/ktpDraftEmbed";
import { buildReviewComponents } from "../../services/ktp/ktpReviewComponents";
import type { Agama } from "../../services/ktp/ktpOptions";

const component: SelectMenuComponent = {
  customId: "ktp:select-agama",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const agama = interaction.values[0]! as Agama;
    const draft = await saveDraft(interaction.guildId, interaction.user.id, { agama });

    await interaction.update({
      embeds: [buildDraftReviewEmbed(draft)],
      components: buildReviewComponents(draft),
    });
  },
};

export default component;
