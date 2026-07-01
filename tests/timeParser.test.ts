import { describe, expect, it } from "vitest";
import { parseDurationMs } from "../src/services/community/timeParser";

describe("parseDurationMs", () => {
  it("parses single units", () => {
    expect(parseDurationMs("30s")).toBe(30_000);
    expect(parseDurationMs("10m")).toBe(600_000);
    expect(parseDurationMs("2h")).toBe(7_200_000);
    expect(parseDurationMs("1d")).toBe(86_400_000);
  });

  it("parses combined units", () => {
    expect(parseDurationMs("1d2h30m")).toBe(86_400_000 + 7_200_000 + 1_800_000);
    expect(parseDurationMs("1h30m")).toBe(5_400_000);
  });

  it("is case-insensitive and tolerates spaces", () => {
    expect(parseDurationMs("2H")).toBe(7_200_000);
    expect(parseDurationMs("1d 12h")).toBe(86_400_000 + 43_200_000);
  });

  it("returns null for invalid or empty input", () => {
    expect(parseDurationMs("")).toBeNull();
    expect(parseDurationMs("abc")).toBeNull();
    expect(parseDurationMs("hello world")).toBeNull();
  });
});
