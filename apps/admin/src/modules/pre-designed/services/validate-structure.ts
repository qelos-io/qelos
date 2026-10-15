import type { IScreenRequirement } from '@qelos/global-types';

const BUILT_IN_HTML_TAGS = new Set([
  'html', 'head', 'title', 'base', 'link', 'meta', 'style', 'body', 'article', 'section', 'nav', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'address', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'main', 'div', 'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby', 'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'span', 'br', 'wbr', 'ins', 'del', 'picture', 'source', 'img', 'iframe', 'embed', 'object', 'param', 'video', 'audio', 'track', 'map', 'area', 'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'form', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'output', 'progress', 'meter', 'fieldset', 'legend', 'details', 'summary', 'dialog', 'script', 'noscript', 'template', 'slot', 'canvas',
]);

const CUSTOM_COMPONENT = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

/** a translation key with the values to fill in */
export interface StructureError {
  key: string;
  params?: Record<string, string>;
}

/** The first thing wrong with the markup of a page, or null when it can be shown. */
export function validateStructure(structure: string | undefined): StructureError | null {
  const trimmed = structure?.trim();
  if (!trimmed) return null;
  const template = document.createElement('template');
  try {
    template.innerHTML = trimmed;
  } catch {
    return { key: 'Invalid HTML structure. Please fix the markup and try again.' };
  }
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    const tag = element.tagName.toLowerCase();
    if (!BUILT_IN_HTML_TAGS.has(tag) && !CUSTOM_COMPONENT.test(tag)) {
      return { key: 'Invalid tag "{tag}". Custom components must use kebab-case.', params: { tag: element.tagName } };
    }
    if (Array.from(element.attributes).some((attr) => !attr.name.trim())) {
      return { key: 'Found an attribute without a proper name on <{tag}>.', params: { tag: element.tagName } };
    }
  }
  return null;
}

/** A requirement that is filled in enough to be loaded (unfinished ones would hide the whole preview). */
export function isRequirementComplete(req: Partial<IScreenRequirement> | undefined): boolean {
  if (!req?.key?.trim()) return false;
  if (req.fromBlueprint) return !!req.fromBlueprint.name;
  if (req.fromCrud) return !!req.fromCrud.name;
  if (req.fromHTTP) return !!req.fromHTTP.uri;
  if (req.fromData !== undefined) return true;
  return false;
}

export const completeRequirements = (list: Array<Partial<IScreenRequirement>> | undefined) => (list || []).filter(isRequirementComplete) as IScreenRequirement[];

export const requirementType = (req: Partial<IScreenRequirement>): 'fromBlueprint' | 'fromCrud' | 'fromData' | 'fromHTTP' | '' =>
  req.fromBlueprint ? 'fromBlueprint' : req.fromCrud ? 'fromCrud' : req.fromData ? 'fromData' : req.fromHTTP ? 'fromHTTP' : '';

/** keys used more than once: the page can only read one of them */
export function duplicateKeys(list: Array<Partial<IScreenRequirement>>): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  list.forEach((req) => {
    const key = req.key?.trim();
    if (!key) return;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return duplicates;
}
