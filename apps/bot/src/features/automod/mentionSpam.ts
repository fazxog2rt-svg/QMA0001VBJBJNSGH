export interface MentionSpamResult {
  triggered: boolean;
  count: number;
}

const DEFAULT_THRESHOLD = 5;

/** Flags messages that mass-mention users/roles/@everyone beyond a threshold. */
export function checkMentionSpam(
  userMentionCount: number,
  roleMentionCount: number,
  mentionsEveryone: boolean,
  threshold: number = DEFAULT_THRESHOLD,
): MentionSpamResult {
  const count = userMentionCount + roleMentionCount + (mentionsEveryone ? threshold : 0);
  return { triggered: count >= threshold, count };
}
