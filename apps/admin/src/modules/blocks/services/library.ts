/** Pure helpers shared by the content boxes and components screens. */

export interface CompileError {
  message: string;
  snippet: string;
}

/** The backend reports compile failures as "<message>\n\n<code snippet>". */
export function parseCompileError(reason?: string | null): CompileError | null {
  if (!reason || typeof reason !== 'string') return null;
  const [message, ...rest] = reason.split('\n\n');
  return { message: message.trim(), snippet: rest.join('\n\n').trimEnd() };
}

/** `MyFancyCard` → `my-fancy-card` (also used for identifiers). */
export function toKebab(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const IDENTIFIER_PATTERN = /^[a-zA-Z0-9-]+$/;

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Name, identifier and description guessed from a dropped/imported `.vue` file. */
export function extractComponentInfo(content: string, fileName: string) {
  const base = fileName.replace(/\.vue$/i, '');
  const componentName = capitalize(base.replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase()));
  const comment = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\/|<!--\s*([\s\S]*?)\s*-->/);
  const fromComment = (comment?.[1] || comment?.[2] || '')
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    componentName,
    identifier: toKebab(componentName),
    description: fromComment || `${componentName} component`,
  };
}

/** The tag to put in a template to use a registered component. */
export function componentUsageTag(componentName: string) {
  return `<${toKebab(componentName)}></${toKebab(componentName)}>`;
}

export function contentBoxEmbed(id: string) {
  return `<content-box identifier="${id}"></content-box>`;
}

export function parsePropsJson(text: string): { value: Record<string, unknown>; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { value: {}, error: '' };
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: {}, error: 'Props must be a JSON object' };
    }
    return { value: parsed, error: '' };
  } catch (error: any) {
    return { value: {}, error: error?.message || 'Invalid JSON' };
  }
}

export function htmlToText(html: string | null | undefined, max = 140) {
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Case-insensitive match of every word in `query` against the given fields. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}
