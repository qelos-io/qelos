/**
 * Which callback addresses an MCP sign-in may return to, given the `permittedCallbackUrls` of the tenant:
 * `isRedirectUriPermitted` of `apps/auth/server/services/mcp-oauth-service.ts`.
 */

const KNOWN_CLIENTS: Array<[string, RegExp]> = [
  ['cursor', /^cursor:\/\//i],
  ['claude', /^https:\/\/(claude\.ai|claude\.com|.*\.anthropic\.com)/i],
  ['codex', /^https:\/\/(chatgpt\.com|.*\.openai\.com)/i],
  ['devin', /^https:\/\/(.*\.)?devin\.ai/i],
  ['mintmcp', /^https:\/\/(.*\.)?mintmcp\.com/i],
  ['opencode', /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/mcp\/oauth\/callback/i],
  ['claude-code', /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/callback(?:[/?#]|$)/i],
  ['gemini-cli', /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/oauth\/callback/i],
  ['https', /^https:\/\//i],
  ['http-loopback', /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i],
  ['custom-scheme', /^[a-z][a-z0-9+.-]*:\/\//i],
];

const SCHEME_AND_HOST = String.raw`^[a-z][a-z0-9+.-]*:\/\/(?:\[[^\]]*\]|[^/?#:@[\]]+)`;
/** a wildcard in place of the port, as in `http://127.0.0.1:*\/callback` */
const PORT_WILDCARD = new RegExp(String.raw`(${SCHEME_AND_HOST}):\*(?=[/?#]|$)`, 'i');
const REDIRECT_PORT = new RegExp(String.raw`${SCHEME_AND_HOST}:(\d+)(?=[/?#]|$)`, 'i');
const NOTHING_OR_SCHEME = /^([a-z][a-z0-9+.-]*:\/\/)?$/i;

const clientOf = (url: string) => KNOWN_CLIENTS.find(([, pattern]) => pattern.test(url))?.[0];

/** scheme, host and port of an address; null when it names no host */
function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin;
    if (parsed.host) return `${parsed.protocol}//${parsed.host}`;
    return url.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function matchesEntry(redirectUri: string, permitted: string): boolean {
  if (!permitted) return false;
  if (PORT_WILDCARD.test(permitted)) {
    const port = REDIRECT_PORT.exec(redirectUri)?.[1];
    if (!port) return false;
    const withPort = permitted.replace(PORT_WILDCARD, `$1:${port}`);
    return withPort.endsWith('*') ? redirectUri.startsWith(withPort.slice(0, -1)) : redirectUri === withPort;
  }
  if (permitted.endsWith('*')) {
    const prefix = permitted.slice(0, -1);
    return redirectUri.startsWith(prefix) && (NOTHING_OR_SCHEME.test(prefix) || originOf(redirectUri) === originOf(prefix));
  }
  if (redirectUri === permitted) return true;
  // a known client may use other paths of its permitted address
  const client = clientOf(redirectUri);
  if (!client || client !== clientOf(permitted)) return false;
  const [origin, wanted] = [originOf(redirectUri), originOf(permitted)];
  if (origin || wanted) return origin === wanted;
  const base = permitted.replace(/\/$/, '');
  return ['/', '?', '#'].some((boundary) => redirectUri.startsWith(`${base}${boundary}`));
}

export const isRedirectUriPermitted = (redirectUri: string, permittedCallbackUrls: string[] = []): boolean =>
  !!redirectUri && permittedCallbackUrls.some((permitted) => matchesEntry(redirectUri.trim(), permitted.trim()));
