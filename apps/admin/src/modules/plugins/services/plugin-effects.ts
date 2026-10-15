import type { IMicroFrontend, IPlugin } from '@/services/types/plugin';

export type PluginSection = 'ui' | 'endpoints' | 'events' | 'connection';
export type MfeKind = 'page' | 'component' | 'modal' | 'unplaced';
export type MfeSource = 'template' | 'url' | 'none';

type PluginLike = Partial<Pick<IPlugin, 'apiPath' | 'proxyUrl' | 'manifestUrl' | 'subscribedEvents' | 'microFrontends' | 'cruds' | 'injectables' | 'navBarGroups'>>;

export interface PluginEffects {
  pages: number;
  components: number;
  modals: number;
  injectables: number;
  /** the plugin has an API path that is proxied to an external server */
  proxy: boolean;
  cruds: number;
  events: number;
  /** number of items per editor section (shown on the rail) */
  sections: Record<PluginSection, number>;
  total: number;
  doesNothing: boolean;
}

export const PLUGIN_SECTIONS: PluginSection[] = ['ui', 'endpoints', 'events', 'connection'];

export function mfeKind(mfe: Partial<IMicroFrontend>): MfeKind {
  // older data kept empty `{}` objects for the kinds a micro frontend is not, so look at the content
  if (mfe.route?.path) return 'page';
  if (mfe.modal?.name) return 'modal';
  if (mfe.global?.position) return 'component';
  if (mfe.route) return 'page';
  return 'unplaced';
}

export function mfeSource(mfe: Partial<IMicroFrontend>): MfeSource {
  if (mfe.url && mfe.url !== '-') return 'url';
  if (mfe.use) return 'template';
  return 'none';
}

export function summarizePlugin(plugin: PluginLike): PluginEffects {
  const mfes = plugin.microFrontends || [];
  const kinds = mfes.map(mfeKind);
  const count = (kind: MfeKind) => kinds.filter((k) => k === kind).length;
  const proxy = !!(plugin.apiPath && plugin.proxyUrl);
  const cruds = plugin.cruds?.length || 0;
  const events = plugin.subscribedEvents?.length || 0;
  const injectables = plugin.injectables?.length || 0;
  const sections: Record<PluginSection, number> = {
    ui: mfes.length + injectables,
    endpoints: (proxy ? 1 : 0) + cruds,
    events,
    connection: plugin.manifestUrl ? 1 : 0,
  };
  const total = sections.ui + sections.endpoints + sections.events;
  return {
    pages: count('page'),
    components: count('component'),
    modals: count('modal'),
    injectables,
    proxy,
    cruds,
    events,
    sections,
    total,
    doesNothing: total === 0,
  };
}

export function isPluginSection(value: unknown): value is PluginSection {
  return typeof value === 'string' && (PLUGIN_SECTIONS as string[]).includes(value);
}

export function mfePageHref(mfe: Partial<IMicroFrontend>): string | undefined {
  const path = mfe.route?.path;
  return path ? '/' + path.replace(/^\/+/, '') : undefined;
}

/**
 * Where an admin edits the page in place. Guest pages are public, so they are edited under
 * `/screen-editor/…` (admin only); signed-in pages are edited on the page itself.
 */
export function mfeLiveEditHref(mfe: Partial<IMicroFrontend>): string | undefined {
  const href = mfePageHref(mfe);
  if (!href) return undefined;
  return mfe.guest ? '/screen-editor' + href : href;
}

/** switch a micro frontend to another kind, dropping the settings of the old one */
export function switchMfeKind(mfe: IMicroFrontend, kind: Exclude<MfeKind, 'unplaced'>) {
  if (mfeKind(mfe) === kind) return;
  const slug = newMicroFrontend(kind, mfe.name || 'item');
  delete (mfe as Partial<IMicroFrontend>).route;
  delete (mfe as Partial<IMicroFrontend>).modal;
  delete (mfe as Partial<IMicroFrontend>).global;
  if (kind === 'page') mfe.route = slug.route;
  else if (kind === 'modal') mfe.modal = slug.modal;
  else mfe.global = slug.global;
}

/** only template pages (not iframe URLs) can be edited in place */
export function canEditLive(mfe: Partial<IMicroFrontend>): boolean {
  return mfeKind(mfe) === 'page' && mfeSource(mfe) !== 'url';
}

export function newMicroFrontend(kind: Exclude<MfeKind, 'unplaced'>, name: string): IMicroFrontend {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
  const base = {
    name,
    description: '',
    active: true,
    opened: false,
    manifestUrl: '',
    url: '',
    use: 'plain',
    roles: ['*'],
    workspaceRoles: ['*'],
    guest: false,
  } as unknown as IMicroFrontend;
  if (kind === 'page') {
    base.route = { name: slug, path: slug, roles: ['*'], navBarPosition: 'top' };
  } else if (kind === 'modal') {
    base.modal = { name: slug, params: [], size: 'md' };
  } else {
    base.global = { position: 'top' };
  }
  return base;
}

export interface PluginTemplate {
  key: 'proxy' | 'analytics' | 'events' | 'remote' | 'manual';
  /** the section that opens first in the editor */
  section: PluginSection;
}

export const PLUGIN_TEMPLATES: PluginTemplate[] = [
  { key: 'proxy', section: 'endpoints' },
  { key: 'analytics', section: 'ui' },
  { key: 'events', section: 'events' },
  { key: 'remote', section: 'connection' },
  { key: 'manual', section: 'ui' },
];

export interface NavGroupOption {
  key: string;
  name: string;
  pluginName: string;
  own: boolean;
  priority?: number;
}

/** Navigation groups a page can join: the ones of the plugin being edited first, then those of other plugins. */
export function collectNavGroups(
  others: Array<Pick<IPlugin, 'name' | 'navBarGroups'> & { _id?: string }>,
  current: PluginLike & { _id?: string; name?: string },
): NavGroupOption[] {
  const map = new Map<string, NavGroupOption>();
  (current.navBarGroups || []).forEach((g) => {
    if (g.key && !map.has(g.key)) map.set(g.key, { key: g.key, name: g.name || g.key, pluginName: current.name || '', own: true, priority: g.priority });
  });
  others.forEach((plugin) => {
    if (current._id && plugin._id === current._id) return;
    (plugin.navBarGroups || []).forEach((g) => {
      if (g.key && !map.has(g.key)) map.set(g.key, { key: g.key, name: g.name || g.key, pluginName: plugin.name, own: false, priority: g.priority });
    });
  });
  return [...map.values()].sort((a, b) => Number(b.own) - Number(a.own) || (a.priority || 99999) - (b.priority || 99999));
}
