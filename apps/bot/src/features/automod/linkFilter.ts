const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export interface LinkCheckResult {
  triggered: boolean;
  links: string[];
}

/** Flags any message containing a bare URL. Allowlist is applied by the caller if needed. */
export function checkLinks(content: string, allowlist: string[] = []): LinkCheckResult {
  const matches = content.match(URL_REGEX) ?? [];
  const links = matches.filter((url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return !allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    } catch {
      return true;
    }
  });
  return { triggered: links.length > 0, links };
}
