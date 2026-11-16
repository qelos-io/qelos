/**
 * Pure helpers for the agent tools that work with scripts (js/ts modules) and Vue components.
 * Both live in one folder-like space: an identifier is a path such as `utils/format-price`
 * or `products/ProductCard`, and a component imports a script with `./utils/format-price.ts`.
 */

export type ScriptItemType = 'script' | 'component';

export interface ScriptItem {
  _id?: string;
  type?: ScriptItemType;
  identifier: string;
  componentName?: string;
  description?: string;
  requiredProps?: { prop: string; type: string }[];
  content?: string;
}

const EXTENSION_REGEX = /\.(vue|m?[jt]sx?)$/i;
const SEGMENT_REGEX = /^[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)*$/;

/** `/utils//Demo.ts` -> `utils/Demo`: no surrounding slashes and no file extension. */
export function normalizeIdentifier(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(EXTENSION_REGEX, '');
}

export function isValidIdentifier(identifier: string): boolean {
  return SEGMENT_REGEX.test(identifier);
}

/** Joins an optional folder and a name into an identifier (`products` + `Card` -> `products/Card`). */
export function buildIdentifier(name: string, folder?: string): string {
  return normalizeIdentifier([folder, name].filter(Boolean).join('/'));
}

/** How a component (or another script) imports a script at `identifier`. */
export function importPathOf(identifier: string): string {
  return `./${identifier}.ts`;
}

export function typeOf(item: ScriptItem): ScriptItemType {
  return item.type || (item.componentName ? 'component' : 'script');
}

/** The short form agents get when listing: everything needed to pick an item, without the source. */
export function summarizeItem(item: ScriptItem) {
  const type = typeOf(item);
  return {
    id: item._id,
    type,
    identifier: item.identifier,
    name: item.componentName || item.identifier,
    description: item.description || '',
    ...(type === 'script' ? { import: importPathOf(item.identifier) } : { props: item.requiredProps || [] }),
  };
}

/** Filters by type, folder (prefix, any depth) and a free-text query over identifier, name and description. */
export function filterItems(
  items: ScriptItem[],
  options: { type?: ScriptItemType; folder?: string; query?: string } = {},
): ScriptItem[] {
  const folder = options.folder ? normalizeIdentifier(options.folder) : '';
  const words = String(options.query || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  return items.filter(item => {
    if (options.type && typeOf(item) !== options.type) return false;
    if (folder && !item.identifier.startsWith(`${folder}/`)) return false;
    if (!words.length) return true;
    // "BalloonsCard" should also match "balloons" and "card"
    const haystack = [item.identifier, item.componentName, item.description].filter(Boolean).join(' ');
    const spaced = haystack.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return words.some(word => spaced.includes(word) || haystack.toLowerCase().includes(word));
  });
}

/**
 * Finds the item an agent means by `ref`: the exact identifier first (extension and slashes ignored),
 * then a component name, then a unique file name regardless of its folder.
 */
export function findItem(items: ScriptItem[], ref: string): ScriptItem | undefined {
  const identifier = normalizeIdentifier(ref);
  if (!identifier) return undefined;
  const exact = items.find(item => item.identifier === identifier);
  if (exact) return exact;

  const lower = identifier.toLowerCase();
  const byName = items.find(item => item.componentName?.toLowerCase() === lower);
  if (byName) return byName;

  const baseMatches = items.filter(item => item.identifier.split('/').pop()?.toLowerCase() === lower);
  return baseMatches.length === 1 ? baseMatches[0] : undefined;
}
