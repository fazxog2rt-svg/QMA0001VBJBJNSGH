const DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function parseTanggalLahir(input: string): ValidationResult<Date> {
  const match = DATE_PATTERN.exec(input.trim());
  if (!match) {
    return { ok: false, error: "Format tanggal lahir harus DD-MM-YYYY, contoh: 17-08-1995." };
  }

  const [, day, month, year] = match as unknown as [string, string, string, string];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  const isValidCalendarDate =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);

  if (!isValidCalendarDate) {
    return { ok: false, error: "Tanggal lahir tidak valid." };
  }

  if (date.getTime() > Date.now()) {
    return { ok: false, error: "Tanggal lahir tidak boleh di masa depan." };
  }

  return { ok: true, value: date };
}

export function validateNik(input: string): ValidationResult<string> {
  const nik = input.trim();
  if (!/^\d{16}$/.test(nik)) {
    return { ok: false, error: "NIK harus berupa 16 digit angka." };
  }
  return { ok: true, value: nik };
}

export function validateKodePos(input: string): ValidationResult<string> {
  const kodePos = input.trim();
  if (!/^\d{5}$/.test(kodePos)) {
    return { ok: false, error: "Kode pos harus berupa 5 digit angka." };
  }
  return { ok: true, value: kodePos };
}

export function formatTanggalLahir(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}
