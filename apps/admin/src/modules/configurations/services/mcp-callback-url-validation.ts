export type CallbackUrlClientHint = {
  id: string;
  labelKey: string;
  example: string;
  pattern: RegExp;
  /** When true, the example URL can be added with one click in the admin form. */
  clickable?: boolean;
};

export const CALLBACK_URL_CLIENT_HINTS: CallbackUrlClientHint[] = [
  {
    id: 'cursor',
    labelKey: 'MCP callback client Cursor',
    example: 'cursor://anysphere.cursor-mcp/oauth/callback',
    pattern: /^cursor:\/\//i,
  },
  {
    id: 'claude',
    labelKey: 'MCP callback client Claude',
    example: 'https://claude.ai/api/mcp/auth_callback',
    pattern: /^https:\/\/(claude\.ai|claude\.com|.*\.anthropic\.com)/i,
  },
  {
    id: 'codex',
    labelKey: 'MCP callback client Codex',
    example: 'https://chatgpt.com/aip/mcp/oauth/callback',
    pattern: /^https:\/\/(chatgpt\.com|.*\.openai\.com)/i,
  },
  {
    id: 'devin',
    labelKey: 'MCP callback client Devin',
    example: 'https://app.devin.ai/oauth/callback',
    pattern: /^https:\/\/(.*\.)?devin\.ai/i,
  },
  {
    id: 'mintmcp',
    labelKey: 'MCP callback client mintMCP',
    example: 'https://app.mintmcp.com/oauth/callback',
    pattern: /^https:\/\/(.*\.)?mintmcp\.com/i,
  },
  {
    id: 'opencode',
    labelKey: 'MCP callback client OpenCode',
    example: 'http://127.0.0.1:19876/mcp/oauth/callback',
    pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/mcp\/oauth\/callback/i,
  },
  {
    id: 'claude-code',
    labelKey: 'MCP callback client Claude Code',
    example: 'http://localhost:8088/callback',
    pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/callback(?:[/?#]|$)/i,
  },
  {
    id: 'gemini-cli',
    labelKey: 'MCP callback client Gemini CLI',
    example: 'http://localhost:7777/oauth/callback',
    pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/oauth\/callback/i,
  },
  {
    id: 'https',
    labelKey: 'MCP callback client HTTPS',
    example: 'https://localhost:6274/oauth/callback',
    pattern: /^https:\/\//i,
    clickable: false,
  },
  {
    id: 'custom-scheme',
    labelKey: 'MCP callback client custom scheme',
    example: 'my-app://oauth/callback',
    pattern: /^[a-z][a-z0-9+.-]*:\/\//i,
    clickable: false,
  },
];

export const CLICKABLE_CALLBACK_CLIENT_HINTS = CALLBACK_URL_CLIENT_HINTS.filter(
  (hint) => hint.clickable !== false,
);

const CUSTOM_SCHEME_PATTERN = /^(?!https?:)[a-z][a-z0-9+.-]*:\/\/.+/i;
const HTTPS_PATTERN = /^https:\/\/.+/i;
const HTTP_PATTERN = /^http:\/\/.+/i;
const HTTP_LOOPBACK_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/.+/i;

export function isValidCallbackUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (HTTPS_PATTERN.test(trimmed) || HTTP_LOOPBACK_PATTERN.test(trimmed)) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  if (HTTP_PATTERN.test(trimmed)) {
    return false;
  }

  if (CUSTOM_SCHEME_PATTERN.test(trimmed)) {
    return true;
  }

  return false;
}

export function normalizeCallbackUrl(url: string): string {
  return url.trim();
}

export function isCallbackUrlInList(url: string, permittedCallbackUrls: string[] = []): boolean {
  const normalized = normalizeCallbackUrl(url);
  if (!normalized) {
    return false;
  }

  return permittedCallbackUrls.some((entry) => normalizeCallbackUrl(entry) === normalized);
}

export function detectCallbackUrlClient(url: string): CallbackUrlClientHint | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  return CALLBACK_URL_CLIENT_HINTS.find((hint) => hint.pattern.test(trimmed)) || null;
}
