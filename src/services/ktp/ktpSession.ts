import { redis } from "../../services/redis.service";
import type { Agama, StatusPerkawinan } from "./ktpOptions";

const SESSION_TTL_SECONDS = 900;

export interface KtpDraft {
  nama?: string;
  nik?: string;
  tempatLahir?: string;
  tanggalLahirIso?: string;
  pekerjaan?: string;
  alamat?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  kodePos?: string;
  jenisKelamin?: "Laki-laki" | "Perempuan";
  agama?: Agama;
  statusPerkawinan?: StatusPerkawinan;
  photoUrl?: string;
  theme?: string;
}

function draftKey(guildId: string, userId: string): string {
  return `ktp:draft:${guildId}:${userId}`;
}

export async function getDraft(guildId: string, userId: string): Promise<KtpDraft | null> {
  const raw = await redis.get(draftKey(guildId, userId));
  return raw ? (JSON.parse(raw) as KtpDraft) : null;
}

export async function saveDraft(
  guildId: string,
  userId: string,
  patch: Partial<KtpDraft>,
): Promise<KtpDraft> {
  const existing = (await getDraft(guildId, userId)) ?? {};
  const merged = { ...existing, ...patch };
  await redis.set(draftKey(guildId, userId), JSON.stringify(merged), "EX", SESSION_TTL_SECONDS);
  return merged;
}

export async function clearDraft(guildId: string, userId: string): Promise<void> {
  await redis.del(draftKey(guildId, userId));
}
