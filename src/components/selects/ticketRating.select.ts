import type { SelectMenuComponent } from "../../types/component";
import { Ticket } from "../../database/models/Ticket";
import { successEmbed } from "../../utils/embed";

const component: SelectMenuComponent = {
  customId: "ticket:rating",
  execute: async (interaction) => {
    const ticketId = interaction.customId.split(":")[2];
    const rating = Number(interaction.values[0]);

    const ticket = await Ticket.findById(ticketId);
    if (ticket) {
      ticket.rating = rating;
      await ticket.save();
    }

    await interaction.update({
      embeds: [successEmbed(`Terima kasih atas ratingmu (${"⭐".repeat(rating)})!`)],
      components: [],
    });
  },
};

export default component;
