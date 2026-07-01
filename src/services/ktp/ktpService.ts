import type { HydratedDocument } from "mongoose";
import { getNextSequence } from "../../database/models/Counter";
import { IdentityCard, type IdentityCardDocument } from "../../database/models/IdentityCard";
import type { KtpDraft } from "./ktpSession";
import { renderIdentityCardPng } from "./ktpCardRenderer";
import { renderIdentityCardPdf } from "./ktpPdfRenderer";

const CARD_VALIDITY_YEARS = 2;

export async function generateNomorIdentitas(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequence("identityCard");
  return `KTP-${year}-${String(seq).padStart(8, "0")}`;
}

export async function upsertIdentityCard(
  guildId: string,
  userId: string,
  draft: Required<
    Pick<
      KtpDraft,
      | "nama"
      | "nik"
      | "tempatLahir"
      | "tanggalLahirIso"
      | "pekerjaan"
      | "alamat"
      | "kecamatan"
      | "kabupaten"
      | "provinsi"
      | "kodePos"
      | "jenisKelamin"
      | "agama"
      | "statusPerkawinan"
    >
  > & { photoUrl: string },
): Promise<HydratedDocument<IdentityCardDocument>> {
  const existing = await IdentityCard.findOne({ guildId, userId });

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + CARD_VALIDITY_YEARS);

  const tanggalLahir = new Date(draft.tanggalLahirIso);

  if (!existing) {
    const nomorIdentitas = await generateNomorIdentitas();
    return IdentityCard.create({
      guildId,
      userId,
      nomorIdentitas,
      nama: draft.nama,
      nik: draft.nik,
      tempatLahir: draft.tempatLahir,
      tanggalLahir,
      jenisKelamin: draft.jenisKelamin,
      agama: draft.agama,
      statusPerkawinan: draft.statusPerkawinan,
      pekerjaan: draft.pekerjaan,
      alamat: draft.alamat,
      kecamatan: draft.kecamatan,
      kabupaten: draft.kabupaten,
      provinsi: draft.provinsi,
      kodePos: draft.kodePos,
      photoUrl: draft.photoUrl,
      status: "pending",
      history: [],
      issuedAt: new Date(),
      validUntil,
    });
  }

  const trackedChanges: [string, string, string][] = [
    ["nama", existing.nama, draft.nama],
    ["nik", existing.nik, draft.nik],
    ["alamat", existing.alamat, draft.alamat],
    ["pekerjaan", existing.pekerjaan, draft.pekerjaan],
  ];

  for (const [field, oldValue, newValue] of trackedChanges) {
    if (oldValue === newValue) continue;
    existing.history.push({ field, oldValue, newValue, changedBy: userId, changedAt: new Date() });
  }

  existing.nama = draft.nama;
  existing.nik = draft.nik;
  existing.tempatLahir = draft.tempatLahir;
  existing.tanggalLahir = tanggalLahir;
  existing.jenisKelamin = draft.jenisKelamin;
  existing.agama = draft.agama;
  existing.statusPerkawinan = draft.statusPerkawinan;
  existing.pekerjaan = draft.pekerjaan;
  existing.alamat = draft.alamat;
  existing.kecamatan = draft.kecamatan;
  existing.kabupaten = draft.kabupaten;
  existing.provinsi = draft.provinsi;
  existing.kodePos = draft.kodePos;
  existing.photoUrl = draft.photoUrl;
  existing.status = "pending";
  existing.verifiedBy = undefined;
  existing.verifiedAt = undefined;
  existing.rejectionReason = undefined;
  existing.validUntil = validUntil;

  await existing.save();
  return existing;
}

export async function renderCardAssets(
  card: IdentityCardDocument,
  guildId: string,
  guildName: string,
): Promise<{ pngBuffer: Buffer; pdfBuffer: Buffer }> {
  const pngBuffer = await renderIdentityCardPng({ card, guildId, guildName });
  const pdfBuffer = await renderIdentityCardPdf({
    card,
    guildId,
    guildName,
    cardPngBuffer: pngBuffer,
  });
  return { pngBuffer, pdfBuffer };
}

export async function verifyIdentityCard(
  guildId: string,
  userId: string,
  verifiedBy: string,
): Promise<HydratedDocument<IdentityCardDocument> | null> {
  return IdentityCard.findOneAndUpdate(
    { guildId, userId },
    { status: "verified", verifiedBy, verifiedAt: new Date(), rejectionReason: undefined },
    { new: true },
  );
}

export async function rejectIdentityCard(
  guildId: string,
  userId: string,
  rejectedBy: string,
  reason: string,
): Promise<HydratedDocument<IdentityCardDocument> | null> {
  return IdentityCard.findOneAndUpdate(
    { guildId, userId },
    { status: "rejected", verifiedBy: rejectedBy, verifiedAt: new Date(), rejectionReason: reason },
    { new: true },
  );
}
