import type { IMicroFrontend, IPlugin } from '@/services/types/plugin';
import { newMicroFrontend, slugify } from './plugin-effects';

export type PageStart = 'blank' | 'table' | 'grid' | 'table-stats' | 'dashboard';
export type PageLink = 'top' | 'bottom' | 'user-dropdown' | false;

export const PAGE_STARTS: PageStart[] = ['blank', 'table', 'grid', 'table-stats', 'dashboard'];

/** the address a page gets from its name ("/sales-report" without the slash) */
export const pageAddress = (name: string) => slugify(name);

type PluginPages = Pick<IPlugin, 'microFrontends'> & { _id?: string };

/** Another page (of any plugin) or an app screen already answers on this address. */
export function isAddressTaken(address: string, plugins: PluginPages[], reservedPaths: string[] = []): boolean {
  if (!address) return false;
  const wanted = address.replace(/^\/+/, '').toLowerCase();
  if (reservedPaths.some((path) => path.replace(/^\/+/, '').split('/')[0].toLowerCase() === wanted)) return true;
  return plugins.some((plugin) => (plugin.microFrontends || []).some((mfe) => mfe.route?.path?.replace(/^\/+/, '').toLowerCase() === wanted));
}

export function buildNewPage(input: {
  name: string;
  link: PageLink;
  structure?: string;
  requirements?: IMicroFrontend['requirements'];
}): IMicroFrontend {
  const name = input.name.trim();
  const page = newMicroFrontend('page', name);
  page.route!.navBarPosition = input.link;
  page.opened = true;
  page.workspaceLabels = ['*'];
  page.structure = input.structure ?? `<h1>${name}</h1>`;
  page.requirements = input.requirements || [];
  return page;
}

export interface NewPageValues {
  name: string;
  target: 'new' | string;
  start: PageStart;
  blueprint: string;
}

export type NewPageErrors = Partial<Record<'name' | 'address' | 'blueprint', string>>;

export function validateNewPage(values: NewPageValues, plugins: PluginPages[], reservedPaths: string[] = []): NewPageErrors {
  const errors: NewPageErrors = {};
  const address = pageAddress(values.name);
  if (!values.name.trim()) errors.name = 'Give the page a name';
  else if (!address) errors.address = 'Use letters or numbers in the name';
  else if (isAddressTaken(address, plugins, reservedPaths)) errors.address = 'Another page already uses this address';
  if (values.start !== 'blank' && !values.blueprint) errors.blueprint = 'Choose the data this page shows';
  return errors;
}
