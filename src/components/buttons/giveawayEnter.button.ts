import type { ButtonComponent } from "../../types/component";
import { Giveaway } from "../../database/models/Giveaway";
import { buildGiveawayEmbed, buildGiveawayComponents } from "../../services/events/giveawayService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "giveaway:enter",
  execute: async (interaction) => {
    const giveawayId = interaction.customId.split(":")[2];
    const giveaway = await Giveaway.findById(giveawayId).catch(() => null);

    if (!giveaway || giveaway.ended) {
      await interaction.reply({
        embeds: [errorEmbed("Giveaway tidak ditemukan atau sudah berakhir.")],
        ephemeral: true,
      });
      return;
    }

    if (giveaway.entrantIds.includes(interaction.user.id)) {
      // Toggle: leaving the giveaway.
      giveaway.entrantIds = giveaway.entrantIds.filter(
        (id) => id !== interaction.user.id,
      ) as typeof giveaway.entrantIds;
      await giveaway.save();
      await interaction.reply({
        embeds: [successEmbed("Kamu keluar dari giveaway.")],
        ephemeral: true,
      });
    } else {
      giveaway.entrantIds.push(interaction.user.id);
      await giveaway.save();
      await interaction.reply({
        embeds: [successEmbed("Kamu berhasil ikut giveaway! Semoga beruntung 🍀")],
        ephemeral: true,
      });
    }

    // Refresh the entrant count on the original message.
    await interaction.message
      .edit({
        embeds: [buildGiveawayEmbed(giveaway)],
        components: buildGiveawayComponents(giveaway._id.toString(), false),
      })
      .catch(() => undefined);
  },
};

export default component;
