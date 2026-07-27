export type CallbackUrlClientHint = {
  id: string;
  labelKey: string;
  example: string;
  pattern: RegExp;
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
    pattern: /^https:\/\/(claude\.ai|.*\.anthropic\.com)/i,
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
    id: 'https',
    labelKey: 'MCP callback client HTTPS',
    example: 'https://localhost:6274/oauth/callback',
    pattern: /^https:\/\//i,
  },
  {
    id: 'custom-scheme',
    labelKey: 'MCP callback client custom scheme',
    example: 'my-app://oauth/callback',
    pattern: /^[a-z][a-z0-9+.-]*:\/\//i,
  },
];

const CUSTOM_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/.+/i;
const HTTPS_PATTERN = /^https:\/\/.+/i;

export function isValidCallbackUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (CUSTOM_SCHEME_PATTERN.test(trimmed)) {
    return true;
  }

  if (HTTPS_PATTERN.test(trimmed)) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function detectCallbackUrlClient(url: string): CallbackUrlClientHint | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  return CALLBACK_URL_CLIENT_HINTS.find((hint) => hint.pattern.test(trimmed)) || null;
}
