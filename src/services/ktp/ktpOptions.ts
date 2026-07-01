export const AGAMA_OPTIONS = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
] as const;
export const STATUS_OPTIONS = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"] as const;

export type Agama = (typeof AGAMA_OPTIONS)[number];
export type StatusPerkawinan = (typeof STATUS_OPTIONS)[number];
