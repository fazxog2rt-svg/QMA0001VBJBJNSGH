import type { ModalComponent } from "../../types/component";
import { saveDraft } from "../../services/ktp/ktpSession";
import { validateKodePos } from "../../services/ktp/ktpValidation";
import { errorEmbed } from "../../utils/embed";
import { buildDraftReviewEmbed } from "../../services/ktp/ktpDraftEmbed";
import { buildReviewComponents } from "../../services/ktp/ktpReviewComponents";

const component: ModalComponent = {
  customId: "ktp:step2",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const alamat = interaction.fields.getTextInputValue("alamat").trim();
    const kecamatan = interaction.fields.getTextInputValue("kecamatan").trim();
    const kabupaten = interaction.fields.getTextInputValue("kabupaten").trim();
    const provinsi = interaction.fields.getTextInputValue("provinsi").trim();
    const kodePosInput = interaction.fields.getTextInputValue("kodePos");

    const kodePos = validateKodePos(kodePosInput);
    if (!kodePos.ok) {
      await interaction.reply({ embeds: [errorEmbed(kodePos.error!)], ephemeral: true });
      return;
    }

    const draft = await saveDraft(interaction.guildId, interaction.user.id, {
      alamat,
      kecamatan,
      kabupaten,
      provinsi,
      kodePos: kodePos.value,
    });

    await interaction.reply({
      embeds: [buildDraftReviewEmbed(draft)],
      components: buildReviewComponents(draft),
      ephemeral: true,
    });
  },
};

export default component;
