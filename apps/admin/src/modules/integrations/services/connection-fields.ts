import { IntegrationSourceKind } from '@qelos/global-types';

export type ConnectionFieldType = 'text' | 'url' | 'email' | 'secret' | 'choice';

export interface ConnectionField {
  /** Dotted path inside the connection, e.g. `metadata.clientId` or `authentication.clientSecret`. */
  path: string;
  label: string;
  type: ConnectionFieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  ltr?: boolean;
  /** Choice fields: the allowed values, the first being the default. */
  options?: Array<{ value: string; label: string }>;
  /** Shown while this value is selected, e.g. a warning for live payments. */
  warnOn?: { value: string; text: string };
  /** Shortest value accepted once something is typed. */
  minLength?: number;
}

export interface ConnectionSchema {
  /** What the provider is used for - shown under the drawer title. */
  description: string;
  basics: ConnectionField[];
  credentials: ConnectionField[];
  /** Where the provider hands out credentials (only links already used by the previous forms). */
  help?: { url: string; label: string };
}

const payments = (
  description: string,
  helpUrl: string,
  helpLabel: string,
  secret: ConnectionField,
  before: ConnectionField[],
  environments: string[],
): ConnectionSchema => ({
  description,
  basics: [
    ...before,
    {
      path: 'metadata.environment',
      label: 'Environment',
      type: 'choice',
      required: true,
      options: environments.map((value) => ({ value, label: value === 'live' ? 'Live' : value === 'test' ? 'Test' : 'Sandbox' })),
      warnOn: { value: 'live', text: 'Live mode processes real payments. Use production credentials.' },
    },
  ],
  credentials: [secret],
  help: { url: helpUrl, label: helpLabel },
});

const oauth = (description: string): ConnectionSchema => ({
  description,
  basics: [
    { path: 'metadata.clientId', label: 'Client ID', type: 'text', required: true, ltr: true },
    {
      path: 'metadata.scope',
      label: 'Scope',
      type: 'text',
      required: true,
      hint: 'Space-separated list of permissions requested at sign-in',
      ltr: true,
    },
  ],
  credentials: [{ path: 'authentication.clientSecret', label: 'Client Secret', type: 'secret', required: true }],
});

export const SIMPLE_CONNECTION_SCHEMAS: Partial<Record<IntegrationSourceKind, ConnectionSchema>> = {
  [IntegrationSourceKind.Facebook]: oauth('Lets people sign in with their Facebook account'),
  [IntegrationSourceKind.Google]: oauth('Lets people sign in with their Google account'),
  [IntegrationSourceKind.GitHub]: oauth('Lets people sign in with their GitHub account'),
  [IntegrationSourceKind.LinkedIn]: oauth('Lets people sign in with their LinkedIn account'),
  [IntegrationSourceKind.Supabase]: {
    description: 'Connects a Supabase project',
    basics: [{ path: 'metadata.url', label: 'URL', type: 'url', required: true, ltr: true }],
    credentials: [],
  },
  [IntegrationSourceKind.N8n]: {
    description: 'Connects an n8n workflow instance',
    basics: [{ path: 'metadata.url', label: 'URL', type: 'url', required: true, ltr: true }],
    credentials: [],
  },
  [IntegrationSourceKind.Qelos]: {
    description: 'Connects another Qelos application',
    basics: [
      { path: 'metadata.url', label: 'URL', type: 'url', required: true, ltr: true },
      { path: 'metadata.username', label: 'Username', type: 'text', required: true, ltr: true },
    ],
    credentials: [{ path: 'authentication.password', label: 'Password', type: 'secret', required: true }],
  },
  [IntegrationSourceKind.Email]: {
    description: 'Sends and receives email through your own mail server',
    basics: [
      { path: 'metadata.senderName', label: 'Sender Name', type: 'text', required: true },
      { path: 'metadata.email', label: 'Email', type: 'email', required: true, ltr: true },
      { path: 'metadata.smtp', label: 'SMTP Address', type: 'text', required: true, ltr: true },
      { path: 'metadata.pop3', label: 'POP3 Address', type: 'text', required: true, ltr: true },
      { path: 'metadata.username', label: 'Username', type: 'text', required: true, ltr: true },
    ],
    credentials: [{ path: 'authentication.password', label: 'Password', type: 'secret', required: true }],
  },
};

SIMPLE_CONNECTION_SCHEMAS[IntegrationSourceKind.Sumit] = {
  description: 'Takes payments through Sumit',
  basics: [{ path: 'metadata.companyId', label: 'Company ID', type: 'text', required: true, ltr: true }],
  credentials: [{ path: 'authentication.apiKey', label: 'API Key', type: 'secret', required: true, minLength: 20 }],
  help: { url: 'https://app.sumit.co.il/developers/keys/', label: 'Get your Company ID and API Key' },
};
SIMPLE_CONNECTION_SCHEMAS[IntegrationSourceKind.PayPal] = payments(
  'Takes payments through PayPal',
  'https://developer.paypal.com/dashboard/applications',
  'Get your Client ID and Secret',
  { path: 'authentication.clientSecret', label: 'Client Secret', type: 'secret', required: true, minLength: 10 },
  [{ path: 'metadata.clientId', label: 'Client ID', type: 'text', required: true, ltr: true }],
  ['sandbox', 'live'],
);
SIMPLE_CONNECTION_SCHEMAS[IntegrationSourceKind.Paddle] = payments(
  'Takes payments through Paddle',
  'https://vendors.paddle.com/authentication',
  'Get your API Key',
  { path: 'authentication.apiKey', label: 'API Key', type: 'secret', required: true, minLength: 10 },
  [],
  ['sandbox', 'live'],
);
SIMPLE_CONNECTION_SCHEMAS[IntegrationSourceKind.DodoPayments] = payments(
  'Takes payments through DodoPayments',
  'https://docs.dodopayments.com/',
  'Get your API Key',
  { path: 'authentication.apiKey', label: 'API Key', type: 'secret', required: true, minLength: 10 },
  [],
  ['test', 'live'],
);

/** Values a new connection starts with, taken from each choice field's first option. */
export function getSchemaDefaults(schema: ConnectionSchema): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const field of schema.basics) if (field.options?.length) defaults[field.path] = field.options[0].value;
  return defaults;
}

export function getConnectionSchema(kind: string): ConnectionSchema | undefined {
  return SIMPLE_CONNECTION_SCHEMAS[kind as IntegrationSourceKind];
}

export function getPath(source: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

export function setPath(target: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (cursor[key] == null || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

const isSecret = (field: ConnectionField) => field.type === 'secret';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns an i18n key of the problem per field path; empty when the form is valid. */
export function validateConnection(
  schema: ConnectionSchema,
  model: any,
  typedSecrets: Record<string, string>,
  isEdit: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!String(model?.name ?? '').trim()) errors.name = 'Name is required';

  for (const field of [...schema.basics, ...schema.credentials]) {
    if (isSecret(field)) {
      const typed = String(typedSecrets[field.path] ?? '').trim();
      if (field.required && !isEdit && !typed) errors[field.path] = 'This field is required';
      else if (typed && field.minLength && typed.length < field.minLength) errors[field.path] = 'This value looks too short';
      continue;
    }
    const value = String(getPath(model, field.path) ?? '').trim();
    if (!value) {
      if (field.required) errors[field.path] = 'This field is required';
    } else if (field.type === 'url' && !isValidUrl(value)) {
      errors[field.path] = 'Enter a full address starting with http:// or https://';
    } else if (field.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
      errors[field.path] = 'Enter a valid email address';
    }
  }
  return errors;
}

/**
 * The payload the connection API receives. Secrets are sent only when typed;
 * on edit an untouched secret is left out so the saved one is kept.
 */
export function buildConnectionPayload(
  schema: ConnectionSchema,
  kind: string,
  model: any,
  typedSecrets: Record<string, string>,
): any {
  const payload = { ...model, kind, authentication: { ...(model?.authentication || {}) } };
  for (const field of schema.credentials) {
    const key = field.path.replace(/^authentication\./, '');
    const typed = typedSecrets[field.path];
    if (typed) payload.authentication[key] = typed;
    else delete payload.authentication[key];
  }
  return payload;
}

/** Authentication the status check should try, or undefined when nothing was typed. */
export function buildAuthenticationOverride(
  schema: ConnectionSchema,
  typedSecrets: Record<string, string>,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const field of schema.credentials) {
    const typed = typedSecrets[field.path];
    if (typed) result[field.path.replace(/^authentication\./, '')] = typed;
  }
  return Object.keys(result).length ? result : undefined;
}

/** Labels other connections already use - sorted, unique, case-insensitive. */
export function collectLabelSuggestions(sources: Array<{ labels?: string[] }> | undefined): string[] {
  const seen = new Map<string, string>();
  for (const source of sources || []) {
    for (const label of source.labels || []) {
      const trimmed = String(label).trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
