const INVITE_REGEX = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

export interface InviteCheckResult {
  triggered: boolean;
  codes: string[];
}

/** Flags Discord invite links; `ownGuildInviteCodes` lets in-guild vanity/self invites through. */
export function checkInvites(content: string, ownGuildInviteCodes: string[] = []): InviteCheckResult {
  const codes: string[] = [];
  for (const match of content.matchAll(INVITE_REGEX)) {
    const code = match[1];
    if (!ownGuildInviteCodes.includes(code)) codes.push(code);
  }
  return { triggered: codes.length > 0, codes };
}
