import { reactive } from 'vue';

/** What the person editing a page currently points at. Only one page is edited at a time. */
export const editingState = reactive({
  /** the rendered element under the pointer */
  hovered: null as Element | null,
  /** `data-ql-id` of the picked block */
  selectedQlId: null as string | null,
  structureOpen: false,
  /** width in px the editing panels cover on the inline-end side, which the page leaves free */
  reserve: 0,
});

/**
 * A draft of the page shown instead of the saved one while something is being designed (a component being added or
 * edited, code being typed). Leaving it null shows the saved page.
 */
export const previewState = reactive({
  structure: null as string | null,
  requirements: null as any[] | null,
});

export function setPreview(structure: string, requirements?: any[] | null) {
  previewState.structure = structure;
  previewState.requirements = requirements ?? null;
}

export function clearPreview() {
  previewState.structure = null;
  previewState.requirements = null;
}

export const ownerOf = (el: Element | null) => el?.closest('[data-ql-tag]') ?? null;

/** The element a block is rendered as. A block repeated by `v-for` renders many; the first one stands for it. */
export function renderedBlock(qlId: string | null): Element | null {
  if (!qlId) return null;
  return document.querySelector(`[data-ql-id="${CSS.escape(qlId)}"][data-ql-tag]`);
}

export function selectBlock(qlId: string | null, { reveal = false } = {}) {
  editingState.selectedQlId = qlId;
  if (reveal) renderedBlock(qlId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function clearEditingState() {
  editingState.hovered = null;
  editingState.selectedQlId = null;
}
