/**
 * Lightweight keyword + suspicious-domain heuristic scanner. This is
 * intentionally simple (not ML-based) — ambiguous cases can be escalated to
 * the AI provider by the orchestrator when aiAssistantEnabled is on.
 */

const SCAM_KEYWORDS = [
  "free nitro",
  "steam gift",
  "claim your reward",
  "you have been selected",
  "airdrop claim",
  "double your crypto",
  "verify your wallet",
  "seed phrase",
  "connect your wallet to claim",
];

const SUSPICIOUS_DOMAINS = [
  "discocl.com",
  "discord-nitro.com",
  "discordgift.site",
  "steamcommunlty.com",
  "dlscord.com",
  "discrod.gg",
];

export interface ScamCheckResult {
  triggered: boolean;
  confidence: "low" | "medium" | "high";
  reasons: string[];
}

export function checkScamPhishing(content: string): ScamCheckResult {
  const lower = content.toLowerCase();
  const reasons: string[] = [];

  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword)) reasons.push(`keyword:${keyword}`);
  }
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) reasons.push(`domain:${domain}`);
  }

  const confidence: ScamCheckResult["confidence"] =
    reasons.length >= 2 ? "high" : reasons.length === 1 ? "medium" : "low";

  return { triggered: reasons.length > 0, confidence, reasons };
}
