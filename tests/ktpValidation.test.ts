import { describe, expect, it } from "vitest";
import { formatTanggalLahir, parseTanggalLahir, validateKodePos, validateNik } from "../src/services/ktp/ktpValidation";

describe("validateNik", () => {
  it("accepts a 16-digit NIK", () => {
    expect(validateNik("3275010101990001").ok).toBe(true);
  });

  it("rejects non-16-digit or non-numeric input", () => {
    expect(validateNik("123").ok).toBe(false);
    expect(validateNik("32750101019900AB").ok).toBe(false);
    expect(validateNik("327501010199000123").ok).toBe(false);
  });
});

describe("validateKodePos", () => {
  it("accepts 5 digits", () => {
    expect(validateKodePos("10310").ok).toBe(true);
  });

  it("rejects wrong length or non-numeric", () => {
    expect(validateKodePos("1031").ok).toBe(false);
    expect(validateKodePos("103100").ok).toBe(false);
    expect(validateKodePos("1031A").ok).toBe(false);
  });
});

describe("parseTanggalLahir", () => {
  it("parses a valid DD-MM-YYYY date", () => {
    const result = parseTanggalLahir("17-08-1995");
    expect(result.ok).toBe(true);
    expect(result.value?.getUTCFullYear()).toBe(1995);
    expect(result.value?.getUTCMonth()).toBe(7); // August = 7
    expect(result.value?.getUTCDate()).toBe(17);
  });

  it("rejects malformed input", () => {
    expect(parseTanggalLahir("1995-08-17").ok).toBe(false);
    expect(parseTanggalLahir("17/08/1995").ok).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(parseTanggalLahir("31-02-2000").ok).toBe(false);
    expect(parseTanggalLahir("32-01-2000").ok).toBe(false);
  });

  it("rejects future dates", () => {
    expect(parseTanggalLahir("01-01-2999").ok).toBe(false);
  });

  it("round-trips through formatTanggalLahir", () => {
    const parsed = parseTanggalLahir("09-03-1988");
    expect(parsed.ok).toBe(true);
    expect(formatTanggalLahir(parsed.value!)).toBe("09-03-1988");
  });
});
