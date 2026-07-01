import { describe, expect, it } from "vitest";
import { containsInviteLink, containsScamLink, countUniqueMentions } from "../src/services/security/autoModDetectors";

describe("containsInviteLink", () => {
  it("detects Discord invites", () => {
    expect(containsInviteLink("join discord.gg/abc123")).toBe(true);
    expect(containsInviteLink("https://discord.com/invite/xyz")).toBe(true);
    expect(containsInviteLink("https://discordapp.com/invite/xyz")).toBe(true);
  });

  it("ignores normal messages", () => {
    expect(containsInviteLink("halo semua apa kabar?")).toBe(false);
    expect(containsInviteLink("cek website discord.com/developers")).toBe(false);
  });
});

describe("containsScamLink", () => {
  it("flags scam keywords", () => {
    expect(containsScamLink("FREE NITRO klaim sekarang")).toBe(true);
    expect(containsScamLink("steam gift buat kamu")).toBe(true);
  });

  it("flags suspicious TLDs in URLs", () => {
    expect(containsScamLink("http://claim-reward.xyz/free")).toBe(true);
  });

  it("does not flag normal links", () => {
    expect(containsScamLink("lihat repo https://github.com/user/repo")).toBe(false);
    expect(containsScamLink("artikel bagus di https://medium.com/post")).toBe(false);
  });
});

describe("countUniqueMentions", () => {
  it("counts unique ids only", () => {
    expect(countUniqueMentions(["1", "2", "2", "3", "3", "3"])).toBe(3);
    expect(countUniqueMentions([])).toBe(0);
  });
});
