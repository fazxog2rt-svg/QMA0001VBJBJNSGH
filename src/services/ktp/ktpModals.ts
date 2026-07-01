import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export function buildKtpStep1Modal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId("ktp:step1")
    .setTitle("KTP Digital — Data Diri (1/2)");

  const fields = [
    new TextInputBuilder()
      .setCustomId("nama")
      .setLabel("Nama Lengkap")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("nik")
      .setLabel("NIK (16 digit, data fiktif diperbolehkan)")
      .setStyle(TextInputStyle.Short)
      .setMinLength(16)
      .setMaxLength(16)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("tempatLahir")
      .setLabel("Tempat Lahir")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("tanggalLahir")
      .setLabel("Tanggal Lahir (DD-MM-YYYY)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("17-08-1995")
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("pekerjaan")
      .setLabel("Pekerjaan")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
  ];

  modal.addComponents(
    ...fields.map((field) => new ActionRowBuilder<TextInputBuilder>().addComponents(field)),
  );

  return modal;
}

export function buildKtpStep2Modal(): ModalBuilder {
  const modal = new ModalBuilder().setCustomId("ktp:step2").setTitle("KTP Digital — Alamat (2/2)");

  const fields = [
    new TextInputBuilder()
      .setCustomId("alamat")
      .setLabel("Alamat Lengkap")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(200)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("kecamatan")
      .setLabel("Kecamatan")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("kabupaten")
      .setLabel("Kabupaten/Kota")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("provinsi")
      .setLabel("Provinsi")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("kodePos")
      .setLabel("Kode Pos (5 digit)")
      .setStyle(TextInputStyle.Short)
      .setMinLength(5)
      .setMaxLength(5)
      .setRequired(true),
  ];

  modal.addComponents(
    ...fields.map((field) => new ActionRowBuilder<TextInputBuilder>().addComponents(field)),
  );

  return modal;
}
