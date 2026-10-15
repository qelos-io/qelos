/**
 * Pure helpers for the markup of a page (its `structure`): finding, listing, moving and removing blocks.
 * Every block of an edited page carries a `data-ql-id`: its index among all elements, or `outer-inner-index` for
 * elements inside a `<template>`. The ids are only valid for the markup they were computed from.
 */

export type DropPosition = 'before' | 'after';

const BASE_EDITABLE_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'form', 'section', 'article', 'header', 'footer', 'main', 'ul', 'ol', 'table', 'img', 'a', 'button',
]);

/** parts of a bigger component: shown inside their parent, not worth a handle of their own */
const INTERNAL_TAGS = new Set([
  'template', 'el-option', 'el-option-group', 'el-table-column', 'el-icon', 'el-tab-pane', 'el-radio', 'el-radio-button', 'el-checkbox',
  'el-dropdown-item', 'el-dropdown-menu', 'el-skeleton-item', 'el-step', 'el-col', 'el-row', 'el-form-item', 'el-menu-item', 'el-descriptions-item',
]);

export function isEditableTag(tag: string, extra: Iterable<string> = []): boolean {
  const name = tag.toLowerCase();
  if (INTERNAL_TAGS.has(name)) return false;
  if (BASE_EDITABLE_TAGS.has(name) || name.includes('-')) return true;
  for (const item of extra) if (item.toLowerCase() === name) return true;
  return false;
}

export function parseStructure(html?: string): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  return template;
}

export const serializeStructure = (template: HTMLTemplateElement) => template.innerHTML.trim();

export function getElementByQlId(template: HTMLTemplateElement, qlId?: string | null): Element | null {
  if (!qlId) return null;
  const [outerRaw, innerRaw] = qlId.split('-inner-');
  const outerIndex = Number(outerRaw);
  if (Number.isNaN(outerIndex)) return null;
  const outer = Array.from(template.content.querySelectorAll('*'))[outerIndex];
  if (!outer) return null;
  if (innerRaw === undefined) return outer;
  if (outer.tagName.toLowerCase() !== 'template') return null;
  const innerIndex = Number(innerRaw);
  if (Number.isNaN(innerIndex)) return null;
  return Array.from((outer as HTMLTemplateElement).content.querySelectorAll('*'))[innerIndex] || null;
}

/** The id an element of the markup gets (the inverse of `getElementByQlId`). */
export function qlIdOf(template: HTMLTemplateElement, el: Element): string | undefined {
  const outer = Array.from(template.content.querySelectorAll('*'));
  const index = outer.indexOf(el);
  if (index >= 0) return String(index);
  for (let i = 0; i < outer.length; i++) {
    if (outer[i].tagName.toLowerCase() !== 'template') continue;
    const inner = Array.from((outer[i] as HTMLTemplateElement).content.querySelectorAll('*')).indexOf(el);
    if (inner >= 0) return `${i}-inner-${inner}`;
  }
  return undefined;
}

/** Tags every element with its id, and the editable ones with their tag (the rendered root loses its tag name). */
export function annotateStructure(template: HTMLTemplateElement, extraEditable: Iterable<string> = []) {
  const extra = Array.from(extraEditable);
  const tag = (el: Element, id: string) => {
    el.setAttribute('data-ql-id', id);
    if (isEditableTag(el.tagName, extra)) el.setAttribute('data-ql-tag', el.tagName.toLowerCase());
  };
  template.content.querySelectorAll('*').forEach((el, index) => {
    tag(el, String(index));
    if (el.tagName.toLowerCase() === 'template') {
      (el as HTMLTemplateElement).content.querySelectorAll('*').forEach((inner, innerIndex) => tag(inner, `${index}-inner-${innerIndex}`));
    }
  });
}

export interface StructureRow {
  qlId: string;
  tag: string;
  depth: number;
  /** a short description taken from the block's own text or attributes */
  label: string;
  /** shown only under a condition, or repeated for every item */
  conditional: boolean;
  repeated: boolean;
}

const LABEL_ATTRIBUTES = ['title', 'label', 'name', 'description', 'text', 'placeholder', 'resource', 'target'];

export function describeElement(el: Element): string {
  for (const attr of LABEL_ATTRIBUTES) {
    const value = el.getAttribute(attr)?.trim();
    if (value) return value.length > 40 ? value.slice(0, 39) + '…' : value;
  }
  const text = Array.from(el.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .join(' ');
  return text.length > 40 ? text.slice(0, 39) + '…' : text;
}

/** The blocks of a page in document order, with their depth among blocks, for an outline. */
export function buildStructureRows(html: string | undefined, extraEditable: Iterable<string> = []): StructureRow[] {
  const template = parseStructure(html);
  const extra = Array.from(extraEditable);
  const rows: StructureRow[] = [];

  const visit = (root: ParentNode, idOf: (index: number) => string, baseDepth: number) => {
    const elements = Array.from(root.querySelectorAll('*'));
    elements.forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      const innerTemplate = tag === 'template' ? (el as HTMLTemplateElement) : null;
      if (isEditableTag(tag, extra)) {
        let depth = baseDepth;
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          if (isEditableTag(parent.tagName, extra)) depth++;
        }
        rows.push({
          qlId: idOf(index),
          tag,
          depth,
          label: describeElement(el),
          conditional: el.hasAttribute('v-if') || el.hasAttribute('v-else-if') || el.hasAttribute('v-else') || el.hasAttribute('v-show'),
          repeated: el.hasAttribute('v-for'),
        });
      }
      if (innerTemplate) {
        let depth = baseDepth;
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          if (isEditableTag(parent.tagName, extra)) depth++;
        }
        visit(innerTemplate.content, (innerIndex) => `${idOf(index)}-inner-${innerIndex}`, depth);
      }
    });
  };
  visit(template.content, String, 0);
  return rows;
}

const contains = (a: Element, b: Element) => a === b || a.contains(b);

/** Moves a block before/after another. Returns the new markup, or the same markup when the move is not possible. */
export function moveElement(html: string, draggedId: string, targetId: string, position: DropPosition): string {
  if (!draggedId || !targetId || draggedId === targetId) return html;
  const template = parseStructure(html);
  const dragged = getElementByQlId(template, draggedId);
  const target = getElementByQlId(template, targetId);
  if (!dragged || !target || contains(dragged, target)) return html;
  if (position === 'before') target.before(dragged);
  else target.after(dragged);
  return serializeStructure(template);
}

/** Swaps a block with its previous/next sibling block. */
export function moveStep(html: string, qlId: string, direction: 'up' | 'down'): string {
  const template = parseStructure(html);
  const el = getElementByQlId(template, qlId);
  if (!el) return html;
  const sibling = direction === 'up' ? el.previousElementSibling : el.nextElementSibling;
  if (!sibling) return html;
  if (direction === 'up') sibling.before(el);
  else sibling.after(el);
  return serializeStructure(template);
}

export function canMoveStep(html: string, qlId: string): { up: boolean; down: boolean } {
  const el = getElementByQlId(parseStructure(html), qlId);
  return { up: !!el?.previousElementSibling, down: !!el?.nextElementSibling };
}

export function removeElement(html: string, qlId: string): { html: string; removed?: Element } {
  const template = parseStructure(html);
  const el = getElementByQlId(template, qlId);
  if (!el) return { html };
  el.remove();
  return { html: serializeStructure(template), removed: el };
}

/** The id of the closest ancestor block, e.g. to select "the card" from "the button in the card". */
export function parentQlId(html: string, qlId: string, extraEditable: Iterable<string> = []): string | undefined {
  const template = parseStructure(html);
  annotateStructure(template, extraEditable);
  const el = getElementByQlId(template, qlId);
  if (!el) return undefined;
  // directly inside a <template>: the blocks around it are those around the template element
  if (!el.parentElement && qlId.includes('-inner-')) return parentQlId(html, qlId.split('-inner-')[0], extraEditable);
  let parent = el.parentElement;
  while (parent && !parent.hasAttribute('data-ql-tag')) parent = parent.parentElement;
  return parent?.getAttribute('data-ql-id') || undefined;
}
