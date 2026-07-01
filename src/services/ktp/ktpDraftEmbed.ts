import { buildEmbed } from "../../utils/embed";
import type { KtpDraft } from "./ktpSession";

export function isDraftComplete(draft: KtpDraft): boolean {
  return Boolean(
    draft.nama &&
    draft.nik &&
    draft.tempatLahir &&
    draft.tanggalLahirIso &&
    draft.pekerjaan &&
    draft.alamat &&
    draft.kecamatan &&
    draft.kabupaten &&
    draft.provinsi &&
    draft.kodePos &&
    draft.jenisKelamin &&
    draft.agama &&
    draft.statusPerkawinan,
  );
}

export function buildDraftReviewEmbed(draft: KtpDraft) {
  const check = (value: unknown) => (value ? "✅" : "⬜");

  return buildEmbed("primary")
    .setTitle("🪪 Tinjau Data KTP Digital")
    .setDescription("Lengkapi seluruh data di bawah ini sebelum menekan **Buat Kartu**.")
    .addFields(
      {
        name: `${check(draft.nama && draft.nik)} Data Diri`,
        value: draft.nama ? `${draft.nama} • NIK ${draft.nik}` : "_Belum diisi_",
      },
      {
        name: `${check(draft.alamat)} Alamat`,
        value: draft.alamat
          ? `${draft.alamat}, Kec. ${draft.kecamatan}, ${draft.kabupaten}, ${draft.provinsi} ${draft.kodePos}`
          : "_Belum diisi_",
      },
      {
        name: `${check(draft.jenisKelamin)} Jenis Kelamin`,
        value: draft.jenisKelamin ?? "_Belum dipilih_",
        inline: true,
      },
      {
        name: `${check(draft.agama)} Agama`,
        value: draft.agama ?? "_Belum dipilih_",
        inline: true,
      },
      {
        name: `${check(draft.statusPerkawinan)} Status Perkawinan`,
        value: draft.statusPerkawinan ?? "_Belum dipilih_",
        inline: true,
      },
    );
}
