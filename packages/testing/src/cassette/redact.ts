import type { CassetteExchange } from './types.js';

const SECRET_KEY = /^(password|passwd|pwd|token|tokens|access_?token|refresh_?token|api_?token|id_?token|authorization|cookie|set-cookie|secret|client_?secret|api_?key|private_?key|salt)$|secret|password/i;

export const REDACTED = '[REDACTED]';

/** Deep copy with every secret-looking key replaced by `[REDACTED]`. */
export function redactValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactValue) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) && v !== null && v !== undefined && v !== '' ? REDACTED : redactValue(v);
    }
    return out as T;
  }
  return value;
}

/** Same redaction for a query string; also used to normalize incoming requests before matching. */
export function redactQuery(params: URLSearchParams): string {
  const entries = [...params.entries()].map(([k, v]): [string, string] => [k, SECRET_KEY.test(k) ? REDACTED : v]);
  entries.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return new URLSearchParams(entries).toString();
}

/** Redact a raw body: JSON bodies by key, anything else is kept as text. */
export function redactBody(text: string | undefined): { body: unknown; json: boolean } {
  if (!text) return { body: undefined, json: false };
  try {
    return { body: redactValue(JSON.parse(text)), json: true };
  } catch {
    return { body: text, json: false };
  }
}

const PATTERNS: Array<[string, RegExp]> = [
  ['JWT', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.?[A-Za-z0-9_-]*/],
  ['bearer token', /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i],
  ['long hex secret', /\b[0-9a-f]{32,}\b/i],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

/** Names of the secret patterns still present in a serialized exchange. */
export function findSecrets(exchange: CassetteExchange): string[] {
  const text = JSON.stringify(exchange);
  return PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}
