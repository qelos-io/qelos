/** Reading and writing the attributes, classes, style and text of one block of a page. */

export interface StyleRow {
  property: string;
  value: string;
}

export function parseStyle(style: string | null | undefined): StyleRow[] {
  if (!style) return [];
  return style
    .split(';')
    .map((pair) => {
      const index = pair.indexOf(':');
      return index < 0 ? null : { property: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((row): row is StyleRow => !!row && !!row.property && !!row.value);
}

export function serializeStyle(rows: StyleRow[]): string {
  const valid = rows.filter((row) => row.property && row.value);
  return valid.length ? valid.map((row) => `${row.property}: ${row.value}`).join('; ') + ';' : '';
}

export const parseClasses = (value: string | null | undefined) => (value ? value.split(' ').filter(Boolean) : []);

export type FieldType = 'text' | 'switch' | 'select' | 'color';

export interface AttributeField {
  propName: string;
  title: string;
  value: string | boolean;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  /** bound to data (`v-bind:`), `v-on:` handlers and conditions: edited as code, not as a form */
  dynamic: boolean;
}

const COLOR_TYPES = [
  { value: '', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
  { value: 'info', label: 'Info' },
];
const SIZES = [
  { value: '', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'default', label: 'Medium' },
  { value: 'small', label: 'Small' },
];
const ALIGNS = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
const DISPLAYS = [
  { value: '', label: 'Default' },
  { value: 'block', label: 'Block' },
  { value: 'inline', label: 'Inline' },
  { value: 'flex', label: 'Flex' },
  { value: 'grid', label: 'Grid' },
  { value: 'none', label: 'None' },
];
const ENUMS: Record<string, typeof COLOR_TYPES> = { type: COLOR_TYPES, size: SIZES, 'text-align': ALIGNS, align: ALIGNS, display: DISPLAYS };

/** attributes people reach for most, shown before the rest */
export const PRIMARY_ATTRIBUTES = ['title', 'label', 'name', 'description', 'text', 'placeholder', 'type', 'size', 'color', 'value', 'src', 'href', 'alt', 'target', 'disabled', 'readonly', 'required', 'width', 'height'];

const HIDDEN_ATTRIBUTES = ['class', 'style', 'id'];

export const baseName = (propName: string) => (propName.includes(':') ? propName.split(':')[1] : propName);

export function fieldType(propName: string, value: string): Pick<AttributeField, 'type' | 'options'> {
  if (value === 'true' || value === 'false') return { type: 'switch' };
  const name = baseName(propName);
  if (ENUMS[name]) return { type: 'select', options: ENUMS[name] };
  if (name === 'color' || name.endsWith('-color')) return { type: 'color' };
  return { type: 'text' };
}

const titleOf = (name: string) => {
  const text = name.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** the attributes of a block as form fields: the primary ones first, internal `data-ql-*` ones never */
export function attributeFields(el: Element): AttributeField[] {
  const fields = el
    .getAttributeNames()
    .filter((name) => !name.startsWith('data-ql-') && !HIDDEN_ATTRIBUTES.includes(name))
    .map<AttributeField>((propName) => {
      const value = el.getAttribute(propName) ?? '';
      const { type, options } = fieldType(propName, value);
      return {
        propName,
        title: titleOf(baseName(propName)),
        value: type === 'switch' ? value === 'true' : value,
        type,
        options,
        dynamic: propName.startsWith('v-') || propName.startsWith(':') || propName.startsWith('@'),
      };
    });
  const rank = (field: AttributeField) => {
    const index = PRIMARY_ATTRIBUTES.indexOf(baseName(field.propName));
    return field.dynamic ? 1000 : index < 0 ? 500 : index;
  };
  return fields.sort((a, b) => rank(a) - rank(b));
}

export interface ElementState {
  id: string;
  classes: string[];
  style: StyleRow[];
  /** inner markup; `undefined` leaves the content untouched */
  html?: string;
  fields: Pick<AttributeField, 'propName' | 'value'>[];
}

export function readElement(el: Element): ElementState & { fields: AttributeField[] } {
  return {
    id: el.getAttribute('id') || '',
    classes: parseClasses(el.getAttribute('class')),
    style: parseStyle(el.getAttribute('style')),
    html: el.innerHTML,
    fields: attributeFields(el),
  };
}

export function writeElement(el: Element, state: ElementState) {
  const set = (name: string, value: string) => (value ? el.setAttribute(name, value) : el.removeAttribute(name));
  set('id', state.id);
  set('class', state.classes.join(' '));
  set('style', serializeStyle(state.style));
  if (state.html !== undefined) el.innerHTML = state.html;
  state.fields.forEach((field) => {
    try {
      el.setAttribute(field.propName, String(field.value));
    } catch {
      /* a refused attribute is skipped */
    }
  });
}

/** Elements without text content (an image, a line break…) have nothing to edit as text. */
export const hasEditableText = (el: Element) => !['img', 'br', 'hr', 'input', 'canvas'].includes(el.tagName.toLowerCase());
