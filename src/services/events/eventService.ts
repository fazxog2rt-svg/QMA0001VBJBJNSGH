import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { CommunityEventDocument } from "../../database/models/CommunityEvent";
import { buildEmbed } from "../../utils/embed";

type RsvpStatus = "going" | "maybe" | "declined";

export function countRsvp(event: CommunityEventDocument, status: RsvpStatus): number {
  return event.rsvp.filter((entry) => entry.status === status).length;
}

export function buildEventEmbed(event: CommunityEventDocument) {
  const unix = Math.floor(event.startsAt.getTime() / 1000);
  const going = countRsvp(event, "going");
  const maybe = countRsvp(event, "maybe");
  const declined = countRsvp(event, "declined");

  const embed = buildEmbed("premium")
    .setTitle(`📅 ${event.title}`)
    .setDescription(event.description || "_Tidak ada deskripsi._")
    .addFields(
      { name: "Waktu", value: `<t:${unix}:F> (<t:${unix}:R>)` },
      { name: `✅ Hadir (${going})`, value: going > 0 ? "​" : "-", inline: true },
      { name: `🤔 Mungkin (${maybe})`, value: maybe > 0 ? "​" : "-", inline: true },
      { name: `❌ Tidak (${declined})`, value: declined > 0 ? "​" : "-", inline: true },
    );

  if (event.completed) {
    embed.setFooter({ text: "Event telah selesai." });
  }

  return embed;
}

export function buildEventComponents(
  eventId: string,
  completed: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  if (completed) return [];

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:rsvp:going:${eventId}`)
        .setLabel("Hadir")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`event:rsvp:maybe:${eventId}`)
        .setLabel("Mungkin")
        .setEmoji("🤔")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:rsvp:declined:${eventId}`)
        .setLabel("Tidak")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

export function setRsvp(event: CommunityEventDocument, userId: string, status: RsvpStatus): void {
  const existing = event.rsvp.find((entry) => entry.userId === userId);
  if (existing) {
    existing.status = status;
    existing.respondedAt = new Date();
  } else {
    event.rsvp.push({ userId, status, respondedAt: new Date() });
  }
}
