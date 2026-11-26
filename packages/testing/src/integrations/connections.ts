/**
 * Integration sources ("connections") as `apps/plugins` validates them: `services/source-metadata-service.ts`,
 * `source-authentication-service.ts` and the credential rules of `integration-source-status.ts`.
 */

type Values = Record<string, any>;

export class InvalidMetadata extends Error {}
const invalid = (text: string): never => {
  throw new InvalidMetadata(text);
};
const isText = (value: unknown): value is string => typeof value === 'string' && !!value;
const isObject = (value: unknown): value is Values => !!value && typeof value === 'object' && !Array.isArray(value);
const textOrNull = (value: unknown) => (typeof value === 'string' && value.trim()) || null;
const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : null);

function httpUrl(raw: unknown, label: string): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') invalid(`Invalid ${label}: must be a string.`);
  const trimmed = (raw as string).trim();
  if (!trimmed) return null;
  let url: URL | undefined;
  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      url = new URL(candidate);
      break;
    } catch {}
  }
  if (!url) return invalid(`Invalid ${label}: must be a valid URL.`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid(`Invalid ${label}: URL must use http or https.`);
  return url.href;
}

const messages = (list: unknown) =>
  Array.isArray(list)
    ? list
        .map((m) => ({ role: typeof m.role === 'string' ? m.role : 'system', content: typeof m.content === 'string' ? m.content : '' }))
        .filter((m) => !!m.content)
    : [];

function required(metadata: Values, keys: string[], text: string): Values {
  if (!keys.every((key) => isText(metadata[key]))) invalid(text);
  return Object.fromEntries(keys.map((key) => [key, metadata[key]]));
}

function environment(value: unknown, test: string, label: string): string {
  if (value && value !== test && value !== 'live') invalid(`Invalid ${label} metadata: environment must be "${test}" or "live".`);
  return (value as string) || test;
}

function modelProvider(kind: 'openai' | 'gemini', m: Values): Values {
  const label = kind === 'openai' ? 'OpenAI' : 'Gemini';
  return {
    defaultModel: textOrNull(m.defaultModel),
    initialMessages: messages(m.initialMessages),
    defaultTemperature: numberOrNull(m.defaultTemperature),
    defaultTopP: numberOrNull(m.defaultTopP),
    defaultFrequencyPenalty: numberOrNull(m.defaultFrequencyPenalty),
    defaultPresencePenalty: numberOrNull(m.defaultPresencePenalty),
    defaultMaxTokens: numberOrNull(m.defaultMaxTokens),
    defaultResponseFormat: typeof m.defaultResponseFormat === 'string' ? m.defaultResponseFormat : null,
    apiUrl: httpUrl(m.apiUrl, `${label} metadata: apiUrl`),
    ...(kind === 'openai' ? { organizationId: organization(m.organizationId) } : {}),
  };
}

function organization(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') invalid('Invalid OpenAI metadata: organizationId must be a string.');
  return (raw as string).trim() || null;
}

const oauth = (label: string) => (m: Values) => required(m, ['clientId', 'scope'], `Invalid ${label} metadata: clientId and scope are required.`);

const METADATA: Record<string, (metadata: Values) => Values | false> = {
  qelos: ({ external = false, url, username }) => {
    if (!external) return { external };
    return url && username && URL.canParse(url) ? { external, username, url } : false;
  },
  openai: (m) => modelProvider('openai', m),
  gemini: (m) => modelProvider('gemini', m),
  claudeai: (m) => ({ defaultModel: textOrNull(m.defaultModel), initialMessages: messages(m.initialMessages) }),
  linkedin: oauth('LinkedIn'),
  facebook: oauth('Facebook'),
  google: oauth('Google'),
  github: oauth('Github'),
  n8n: ({ url }) => (typeof url === 'string' ? { url } : invalid('Invalid N8n metadata: url is required.')),
  http: ({ baseUrl, headers, query, method }) => {
    if (!URL.canParse(baseUrl)) invalid('Invalid Http metadata: baseUrl is required and must be a valid URL.');
    if (method !== undefined && typeof method !== 'string') invalid('Invalid Http metadata: method must be a string.');
    if (typeof headers !== 'object' || headers === null) invalid('Invalid Http metadata: headers is required.');
    if (Object.values(headers).some((v) => typeof v !== 'string')) invalid('Invalid Http metadata: headers must be an object of strings.');
    // the service words a refused query like refused headers
    if (query && Object.values(query).some((v) => typeof v !== 'string')) invalid('Invalid Http metadata: headers must be an object of strings.');
    return { method: method || 'GET', baseUrl, headers, query: query || {} };
  },
  email: (m) => required(m, ['email', 'pop3', 'senderName', 'smtp', 'username'], 'Invalid Email metadata: email, pop3, senderName, smtp, and username are required.'),
  sumit: (m) => required(m, ['companyId'], 'Invalid Sumit metadata: companyId is required.'),
  paypal: (m) => ({ ...required(m, ['clientId'], 'Invalid PayPal metadata: clientId is required.'), environment: environment(m.environment, 'sandbox', 'PayPal') }),
  paddle: (m) => ({ environment: environment(m.environment, 'sandbox', 'Paddle') }),
  dodopayments: (m) => ({ environment: environment(m.environment, 'test', 'DodoPayments') }),
  aws: (m) => required(m, ['region', 'accessKeyId'], 'Invalid AWS metadata: region and accessKeyId are required.'),
  cloudflare: (m) => {
    const { accountId } = required(m, ['accountId'], 'Invalid Cloudflare metadata: accountId is required.');
    if (m.workersDevSubdomain != null && typeof m.workersDevSubdomain !== 'string') {
      invalid('Invalid Cloudflare metadata: workersDevSubdomain must be a string.');
    }
    return { accountId, workersDevSubdomain: m.workersDevSubdomain || '' };
  },
};

/** the metadata as it is stored; throws `InvalidMetadata` when it is refused */
export const validateMetadata = (kind: string, metadata: Values = {}): Values | false => METADATA[kind]?.(metadata) ?? {};

/** the credential a kind keeps. `required`: nothing is kept without it. `nullable`: `authentication: null` is fine */
const CREDENTIALS: Record<string, { key: string; required?: boolean; nullable?: boolean }> = {
  qelos: { key: 'password' },
  openai: { key: 'token', nullable: true },
  claudeai: { key: 'token', nullable: true },
  gemini: { key: 'token', nullable: true },
  n8n: { key: 'apiKey' },
  sumit: { key: 'apiKey' },
  paddle: { key: 'apiKey' },
  dodopayments: { key: 'apiKey', required: true },
  linkedin: { key: 'clientSecret', required: true },
  facebook: { key: 'clientSecret', required: true },
  google: { key: 'clientSecret', required: true },
  github: { key: 'clientSecret', required: true },
  paypal: { key: 'clientSecret', required: true },
  http: { key: 'securedHeaders' },
  email: { key: 'password' },
  aws: { key: 'secretAccessKey' },
  cloudflare: { key: 'apiToken' },
};

export const isConnectionKind = (kind: unknown): kind is string => typeof kind === 'string' && (kind in CREDENTIALS || kind === 'supabase');

/** Stands for a secret: the mock remembers which credential was given, never its value. */
export const SECRET = '***';

/**
 * What the mock keeps of the credentials of a connection; undefined when the service would keep none (a new
 * connection is then refused). Throws when they are refused.
 */
export function keptCredentials(kind: string, authentication: Values | null = {}): Values | undefined {
  const rule = CREDENTIALS[kind];
  if (!rule) return undefined;
  if (authentication === null && !rule.nullable) throw new TypeError('no authentication');
  const value = authentication?.[rule.key];
  if (kind === 'http' && Object.values(value ?? {}).some((v) => typeof v !== 'string')) throw new TypeError('Invalid secured headers');
  if (rule.required && !value) return undefined;
  return value === undefined || value === '' ? {} : { [rule.key]: SECRET };
}

/** kinds with a status check, and what it needs: `[metadata keys, credentials, refusal, code, success message]` */
const CHECKS: Record<string, [string[], string[], string, string, string]> = {
  sumit: [['companyId'], ['apiKey'], 'Missing API key or Company ID for Sumit integration', 'MISSING_SUMIT_CREDENTIALS', 'Sumit connection verified'],
  paypal: [['clientId'], ['clientSecret'], 'Missing client ID or client secret for PayPal integration', 'MISSING_PAYPAL_CREDENTIALS', 'PayPal connection verified'],
  paddle: [[], ['apiKey'], 'Missing API key for Paddle integration', 'MISSING_PADDLE_CREDENTIALS', 'Paddle connection verified'],
  dodopayments: [[], ['apiKey'], 'Missing API key for DodoPayments integration', 'MISSING_DODO_PAYMENTS_CREDENTIALS', 'DodoPayments connection verified'],
  http: [['baseUrl'], [], 'Missing base URL for HTTP integration', 'MISSING_HTTP_BASE_URL', 'HTTP endpoint reachable (status 200)'],
  openai: [[], ['token'], 'Missing API token for OpenAI integration', 'MISSING_OPENAI_CREDENTIALS', 'OpenAI connection verified'],
  qelos: [['url', 'username'], ['password'], 'Missing URL, username or password for external Qelos integration', 'MISSING_QELOS_CREDENTIALS', 'External Qelos connection verified'],
  email: [['smtp'], ['password'], 'Missing SMTP host or password for Email integration', 'MISSING_EMAIL_CREDENTIALS', 'SMTP connection verified'],
  aws: [['region', 'accessKeyId'], ['secretAccessKey'], 'Missing region, access key ID or secret access key for AWS integration', 'MISSING_AWS_CREDENTIALS', 'AWS Lambda connection verified'],
  cloudflare: [['accountId'], ['apiToken'], 'Missing account ID or API token for Cloudflare integration', 'MISSING_CLOUDFLARE_CREDENTIALS', 'Cloudflare connection verified'],
};

/**
 * The status of a connection that has what the check needs: no provider is called, so it is `connected`.
 * A missing setting or credential is refused with the code of the service.
 */
export function connectionStatus(kind: string, metadata: unknown, authentication: unknown) {
  const result = (status: string, message: string, details?: Values) => ({
    status,
    message,
    kind,
    checkedAt: new Date().toISOString(),
    ...(details ? { details } : {}),
  });
  const check = CHECKS[kind];
  if (!check) return result('unsupported', `Status checks are not supported for ${kind} integration sources yet`);
  const settings = isObject(metadata) ? metadata : {};
  if (kind === 'qelos' && settings.external !== true) return result('connected', 'Internal Qelos connection is always available');
  const secrets = isObject(authentication) ? authentication : {};
  const [needs, credentials, refusal, code, success] = check;
  // `$var` stands for the secret of a connection written by `qelos pull`
  const has = (key: string) => !!(secrets[key] || secrets.$var || (key === 'apiKey' && secrets.apikey));
  if (!needs.every((key) => !!settings[key]) || !credentials.every(has)) return { refused: refusal, code };
  return result('connected', success);
}
