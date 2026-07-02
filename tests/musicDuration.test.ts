import { describe, expect, it } from "vitest";
import { formatDuration } from "../src/services/music/types";

describe("formatDuration", () => {
  it("memformat menit dan detik", () => {
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(9)).toBe("0:09");
  });

  it("memformat jam untuk durasi panjang", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("mengembalikan LIVE untuk durasi nol atau tidak valid", () => {
    expect(formatDuration(0)).toBe("LIVE");
    expect(formatDuration(Number.NaN)).toBe("LIVE");
  });
});
