import type { ButtonComponent } from "../../types/component";
import { CommunityEvent } from "../../database/models/CommunityEvent";
import { buildEventComponents, buildEventEmbed, setRsvp } from "../../services/events/eventService";
import { errorEmbed } from "../../utils/embed";

type RsvpStatus = "going" | "maybe" | "declined";

const component: ButtonComponent = {
  customId: "event:rsvp",
  execute: async (interaction) => {
    const parts = interaction.customId.split(":");
    const status = parts[2] as RsvpStatus;
    const eventId = parts[3];

    const event = await CommunityEvent.findById(eventId).catch(() => null);
    if (!event || event.completed) {
      await interaction.reply({
        embeds: [errorEmbed("Event tidak ditemukan atau sudah selesai.")],
        ephemeral: true,
      });
      return;
    }

    setRsvp(event, interaction.user.id, status);
    await event.save();

    await interaction.update({
      embeds: [buildEventEmbed(event)],
      components: buildEventComponents(event._id.toString(), false),
    });
  },
};

export default component;
