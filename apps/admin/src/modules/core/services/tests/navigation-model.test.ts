import { describe, expect, it } from 'vitest';
import { buildNavSections, filterNavItems, flattenNav, isActivePath, pickTabs } from '../navigation-model';

const t = (key: string) => key;
const base = { isAdmin: true, isPrivileged: true, isWorkspacesActive: false, canCreatePage: false, top: [], bottom: [], t };
const mfe = (path: string, name = path, iconName?: string) => ({ name, route: { path, iconName } });

describe('buildNavSections', () => {
  it('gives a plain user only plugin pages', () => {
    const sections = buildNavSections({ ...base, isAdmin: false, isPrivileged: false, top: [{ key: '', items: [mfe('todos', 'Todos')] }] });
    expect(flattenNav(sections).map((i) => i.to)).toEqual(['/todos']);
  });

  it('adds workspaces only when workspaces are active', () => {
    const labels = (active: boolean) => flattenNav(buildNavSections({ ...base, isWorkspacesActive: active })).map((i) => i.key);
    expect(labels(false)).not.toContain('workspaces');
    expect(labels(true)).toContain('workspaces');
  });

  it('keeps plugin groups before and after the built-in sections, skipping empty groups', () => {
    const sections = buildNavSections({
      ...base,
      top: [{ key: 'DAVID', items: [mfe('my-page')] }, { key: '', items: [] }],
      bottom: [{ key: 'Extras', items: [mfe('extra', 'Extra', 'star')] }],
    });
    expect(sections[0].label).toBe('DAVID');
    expect(sections.at(-1)?.label).toBe('Extras');
    expect(sections.at(-1)?.items[0].icon).toEqual({ mfe: 'star' });
    expect(sections.some((s) => s.items.length === 0)).toBe(false);
  });

  it('offers the create-page action first when allowed', () => {
    const sections = buildNavSections({ ...base, canCreatePage: true });
    expect(sections[0].items[0]).toMatchObject({ action: 'create-page' });
  });
});

describe('pickTabs', () => {
  const sections = buildNavSections({ ...base, top: [{ key: '', items: [mfe('a'), mfe('b')] }] });

  it('takes the first navigable items, skipping actions', () => {
    const withAction = buildNavSections({ ...base, canCreatePage: true, top: [{ key: '', items: [mfe('a'), mfe('b')] }] });
    expect(pickTabs(withAction, 3, '/').map((i) => i.to)).toEqual(['/a', '/b', '/admin-dashboard']);
  });

  it('swaps in the current page when it is not among the first tabs', () => {
    const tabs = pickTabs(sections, 3, '/plugins');
    expect(tabs.map((i) => i.to)).toEqual(['/a', '/b', '/plugins']);
  });
});

describe('isActivePath', () => {
  it('matches the exact path and nested paths only', () => {
    expect(isActivePath('/users', '/users')).toBe(true);
    expect(isActivePath('/users', '/users/123')).toBe(true);
    expect(isActivePath('/users', '/users-old')).toBe(false);
    expect(isActivePath('/', '/users')).toBe(false);
  });
});

describe('filterNavItems', () => {
  const sections = buildNavSections(base);
  it('matches every word against label and section', () => {
    const labels = filterNavItems(sections, 'system plug').map((r) => r.item.label);
    expect(labels).toEqual(['Plugins']);
  });
  it('returns everything for an empty query', () => {
    expect(filterNavItems(sections, '  ').length).toBe(flattenNav(sections).length);
  });
});
