import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { AGAMA_OPTIONS, STATUS_OPTIONS } from "./ktpOptions";
import type { KtpDraft } from "./ktpSession";

export function buildReviewComponents(draft: KtpDraft) {
  const jenisKelaminSelect = new StringSelectMenuBuilder()
    .setCustomId("ktp:select-jeniskelamin")
    .setPlaceholder(draft.jenisKelamin ?? "Pilih Jenis Kelamin")
    .addOptions(
      { label: "Laki-laki", value: "Laki-laki", default: draft.jenisKelamin === "Laki-laki" },
      { label: "Perempuan", value: "Perempuan", default: draft.jenisKelamin === "Perempuan" },
    );

  const agamaSelect = new StringSelectMenuBuilder()
    .setCustomId("ktp:select-agama")
    .setPlaceholder(draft.agama ?? "Pilih Agama")
    .addOptions(
      AGAMA_OPTIONS.map((value) => ({ label: value, value, default: draft.agama === value })),
    );

  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId("ktp:select-status")
    .setPlaceholder(draft.statusPerkawinan ?? "Pilih Status Perkawinan")
    .addOptions(
      STATUS_OPTIONS.map((value) => ({
        label: value,
        value,
        default: draft.statusPerkawinan === value,
      })),
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ktp:finalize")
      .setLabel("Buat Kartu")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ktp:cancel").setLabel("Batal").setStyle(ButtonStyle.Secondary),
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(jenisKelaminSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(agamaSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statusSelect),
    actionButtons,
  ];
}
