import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { MemberDocument } from "../../database/models/Member";
import { formatSocialMediaText } from "./profileService";

export function buildProfileEditModal(member: MemberDocument | null): ModalBuilder {
  const modal = new ModalBuilder().setCustomId("profile:edit").setTitle("Edit Profil");

  const bio = new TextInputBuilder()
    .setCustomId("bio")
    .setLabel("Bio")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false)
    .setValue(member?.bio ?? "");

  const pronouns = new TextInputBuilder()
    .setCustomId("pronouns")
    .setLabel("Pronouns (opsional)")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(30)
    .setRequired(false)
    .setValue(member?.pronouns ?? "");

  const favoriteColor = new TextInputBuilder()
    .setCustomId("favoriteColor")
    .setLabel("Warna Favorit (kode hex, mis. #5865F2)")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(7)
    .setRequired(false)
    .setValue(member?.favoriteColor ?? "");

  const socialMedia = new TextInputBuilder()
    .setCustomId("socialMedia")
    .setLabel("Media Sosial (satu baris per platform)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Instagram: @username\nTwitter: @username")
    .setMaxLength(300)
    .setRequired(false)
    .setValue(member?.socialMedia ? formatSocialMediaText(member.socialMedia) : "");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(bio),
    new ActionRowBuilder<TextInputBuilder>().addComponents(pronouns),
    new ActionRowBuilder<TextInputBuilder>().addComponents(favoriteColor),
    new ActionRowBuilder<TextInputBuilder>().addComponents(socialMedia),
  );

  return modal;
}
