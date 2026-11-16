export type ItemType = 'script' | 'component';

/** Explicit `type` wins; otherwise a componentName or `.vue` identifier means a component. */
export const inferType = (item: any): ItemType => {
  if (item?.type === 'component' || item?.type === 'script') return item.type;
  if (item?.componentName || String(item?.identifier || '').endsWith('.vue')) return 'component';
  return 'script';
};
