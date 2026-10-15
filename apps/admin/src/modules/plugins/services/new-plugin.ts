import type { IPlugin } from '@/services/types/plugin';
import type { PluginSection } from './plugin-effects';
import { slugify } from './plugin-effects';

export type StarterKey = 'remote' | 'proxy' | 'events' | 'analytics' | 'manual';

export interface Starter {
  key: StarterKey;
  /** where the editor opens after the plugin is created */
  section: PluginSection;
}

export const STARTERS: Starter[] = [
  { key: 'remote', section: 'connection' },
  { key: 'proxy', section: 'endpoints' },
  { key: 'events', section: 'events' },
  { key: 'analytics', section: 'ui' },
  { key: 'manual', section: 'ui' },
];

export const isStarterKey = (value: unknown): value is StarterKey => STARTERS.some((s) => s.key === value);

export interface StarterValues {
  name: string;
  manifestUrl: string;
  apiPath: string;
  proxyUrl: string;
  token: string;
  eventSource: string;
  hookUrl: string;
  html: string;
}

export const emptyStarterValues = (): StarterValues => ({
  name: '',
  manifestUrl: '',
  apiPath: '',
  proxyUrl: '',
  token: '',
  eventSource: 'blueprints',
  hookUrl: '',
  html: '',
});

export const isHttpUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const REQUIRED: Record<StarterKey, (keyof StarterValues)[]> = {
  remote: ['manifestUrl'],
  proxy: ['name', 'apiPath', 'proxyUrl'],
  events: ['name', 'hookUrl'],
  analytics: ['name', 'html'],
  manual: ['name'],
};

export type StarterErrors = Partial<Record<keyof StarterValues, string>>;

export function validateStarter(key: StarterKey, values: StarterValues): StarterErrors {
  const errors: StarterErrors = {};
  REQUIRED[key].forEach((field) => {
    if (!values[field].trim()) errors[field] = 'This field is required';
  });
  (['manifestUrl', 'proxyUrl', 'hookUrl'] as const).forEach((field) => {
    if (REQUIRED[key].includes(field) && values[field].trim() && !isHttpUrl(values[field].trim())) {
      errors[field] = 'Enter a full address starting with http:// or https://';
    }
  });
  return errors;
}

/** "Every call to https://app/api/on/orders/*" style previews shown while typing */
export function proxyPreview(origin: string, apiPath: string, proxyUrl: string) {
  const path = slugify(apiPath) || '…';
  const target = proxyUrl.trim().replace(/\/+$/, '') || '…';
  return { from: `${origin}/api/on/${path}/*`, to: `${target}/*` };
}

const absolute = (value: string | undefined, base?: string) => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return base ? new URL(value, base).href : value;
};

/** a plugin from a fetched manifest; relative urls are resolved against the manifest's `appUrl` */
export function pluginFromManifest(manifest: Record<string, any>, manifestUrl: string): Partial<IPlugin> & { hardReset: boolean } {
  return {
    hardReset: true,
    manifestUrl,
    name: manifest.name,
    apiPath: manifest.apiPath,
    proxyUrl: absolute(manifest.proxyUrl, manifest.appUrl),
    callbackUrl: absolute(manifest.callbackUrl, manifest.appUrl),
    registerUrl: absolute(manifest.registerUrl, manifest.appUrl),
  };
}

/** The plugin for every starter except `remote`, which is built from the fetched manifest. */
export function buildPluginFromStarter(key: Exclude<StarterKey, 'remote'>, values: StarterValues): Partial<IPlugin> {
  const name = values.name.trim();
  switch (key) {
    case 'proxy':
      return {
        name,
        apiPath: slugify(values.apiPath),
        proxyUrl: values.proxyUrl.trim().replace(/\/+$/, ''),
        ...(values.token.trim() ? { token: values.token.trim() } : {}),
      };
    case 'events':
      return { name, subscribedEvents: [{ source: values.eventSource, kind: '', eventName: '', hookUrl: values.hookUrl.trim() }] };
    case 'analytics':
      return { name, injectables: [{ name, active: true, html: values.html, description: '' }] as IPlugin['injectables'] };
    default:
      return { name };
  }
}
