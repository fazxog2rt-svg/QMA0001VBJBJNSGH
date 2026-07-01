// Discord bot/user token shapes (base64-ish segments separated by dots).
const TOKEN_REGEX = /[MNO][a-zA-Z\d_-]{23,28}\.[a-zA-Z\d_-]{6}\.[a-zA-Z\d_-]{27,}/g;
// Discord webhook URLs, which can be abused to exfiltrate data or spam.
const WEBHOOK_REGEX = /discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/gi;

export interface TokenGrabberResult {
  triggered: boolean;
  tokens: number;
  webhooks: number;
}

export function checkTokenGrabber(content: string): TokenGrabberResult {
  const tokens = content.match(TOKEN_REGEX)?.length ?? 0;
  const webhooks = content.match(WEBHOOK_REGEX)?.length ?? 0;
  return { triggered: tokens > 0 || webhooks > 0, tokens, webhooks };
}
