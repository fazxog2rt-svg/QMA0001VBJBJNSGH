const INVITE_PATTERN = /(discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;

const SCAM_KEYWORDS = [
  "free nitro",
  "nitro gratis",
  "steam gift",
  "discord-nitro",
  "airdrop claim",
  "klaim hadiah",
  "verify your account",
  "verifikasi akun anda",
];

const SUSPICIOUS_TLDS = [".xyz", ".top", ".click", ".gq", ".tk", ".ml"];
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

export function containsInviteLink(content: string): boolean {
  return INVITE_PATTERN.test(content);
}

export function containsScamLink(content: string): boolean {
  const lower = content.toLowerCase();
  const hasScamKeyword = SCAM_KEYWORDS.some((keyword) => lower.includes(keyword));

  const urls = content.match(URL_PATTERN) ?? [];
  const hasSuspiciousUrl = urls.some((url) =>
    SUSPICIOUS_TLDS.some((tld) => url.toLowerCase().includes(tld)),
  );

  return hasScamKeyword || (hasSuspiciousUrl && urls.length > 0);
}

export function countUniqueMentions(mentionedUserIds: string[]): number {
  return new Set(mentionedUserIds).size;
}
