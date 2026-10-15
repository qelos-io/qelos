export interface Suggestion {
  value: string;
  hint: string;
}

export const CLASS_GROUPS: Array<{ title: string; items: Suggestion[] }> = [
  {
    title: 'Layout',
    items: [
      { value: 'container', hint: 'margin: 10px' },
      { value: 'flex-container', hint: 'flex column layout' },
      { value: 'relative', hint: 'position: relative' },
      { value: 'property-card', hint: 'card with min/max width' },
    ],
  },
  {
    title: 'Flex',
    items: [
      { value: 'flex-row', hint: 'horizontal flex layout' },
      { value: 'flex-row-column', hint: 'responsive flex layout' },
      { value: 'flex-middle', hint: 'align items center' },
      { value: 'flex-space', hint: 'space between items' },
      { value: 'flex-wrap', hint: 'wrap flex items' },
      ...[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: `flex-${n}`, hint: `flex: ${n}` })),
    ],
  },
  {
    title: 'Spacing',
    items: [
      { value: 'pad-top', hint: 'padding-top: 10px' },
      { value: 'pad-start', hint: 'padding-inline-start: 10px' },
    ],
  },
  {
    title: 'Other',
    items: [
      { value: 'small', hint: 'font-size: 80%' },
      { value: 'danger', hint: 'color: danger' },
      { value: 'property-row', hint: 'flex column with padding' },
      { value: 'centered', hint: 'center content' },
      { value: 'link', hint: 'link styling' },
      { value: 'remove-row', hint: 'margin-bottom: 18px' },
    ],
  },
];

export const STYLE_PROPERTY_GROUPS: Array<{ title: string; items: string[] }> = [
  { title: 'Layout', items: ['display', 'position', 'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height', 'overflow', 'z-index', 'flex', 'flex-direction', 'justify-content', 'align-items'] },
  { title: 'Typography', items: ['font-size', 'font-weight', 'font-family', 'text-align', 'line-height', 'letter-spacing', 'text-decoration', 'text-transform'] },
  { title: 'Colors', items: ['color', 'background-color', 'border-color', 'border', 'border-radius', 'box-shadow', 'opacity'] },
  { title: 'Spacing', items: ['margin', 'margin-block-start', 'margin-inline-start', 'margin-block-end', 'margin-inline-end', 'padding', 'padding-block-start', 'padding-inline-start', 'padding-block-end', 'padding-inline-end', 'gap'] },
];

/** classes of the page that are not among the known ones */
export const customClassesOf = (classes: string[]) => {
  const known = new Set(CLASS_GROUPS.flatMap((g) => g.items.map((i) => i.value)));
  return classes.filter((c) => !known.has(c));
};
