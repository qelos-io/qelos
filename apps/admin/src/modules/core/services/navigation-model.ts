export type NavIcon = { fa: string } | { mfe: string } | null;

export interface NavItem {
  key: string;
  label: string;
  /** router path, absent for action items */
  to?: string;
  /** an action id handled by the shell, e.g. "create-page" */
  action?: string;
  icon: NavIcon;
  /** where it comes from, so the shell can tell plugin pages from built-in admin pages */
  origin: 'plugin' | 'core';
}

export interface NavSection {
  key: string;
  /** empty for the un-grouped plugin items */
  label: string;
  items: NavItem[];
}

interface MfeLike {
  name?: string;
  route: { path: string; iconName?: string };
}

export interface MfeGroupLike {
  key?: string;
  name?: string;
  items: MfeLike[];
}

export interface NavContext {
  isAdmin: boolean;
  isPrivileged: boolean;
  isWorkspacesActive: boolean;
  canCreatePage: boolean;
  top: MfeGroupLike[];
  bottom: MfeGroupLike[];
  t: (key: string) => string;
}

const core = (key: string, label: string, to: string, fa: string): NavItem => ({ key, label, to, icon: { fa }, origin: 'core' });

function pluginSections(groups: MfeGroupLike[], prefix: string): NavSection[] {
  return groups
    .filter((group) => group.items?.length)
    .map((group, index) => ({
      key: `${prefix}:${group.key || index}`,
      label: group.key || '',
      items: group.items.map((mfe) => ({
        key: `mfe:${mfe.route.path}`,
        label: mfe.name || mfe.route.path,
        to: '/' + mfe.route.path,
        icon: mfe.route.iconName ? { mfe: mfe.route.iconName } : { fa: 'circle-dot' },
        origin: 'plugin' as const,
      })),
    }));
}

/**
 * Everything the admin can navigate to, in display order. One model feeds the sidebar, the mobile tab bar and
 * the command palette, so a plugin or configuration that adds a page shows up in all of them.
 */
export function buildNavSections(ctx: NavContext): NavSection[] {
  const { t } = ctx;
  const sections: NavSection[] = [];

  if (ctx.canCreatePage) {
    sections.push({
      key: 'actions',
      label: '',
      items: [{ key: 'create-page', label: t('Create New Page'), action: 'create-page', icon: { fa: 'plus-circle' }, origin: 'core' }],
    });
  }

  sections.push(...pluginSections(ctx.top, 'top'));

  if (ctx.isPrivileged) {
    const items = [core('dashboard', t('Admin Dashboard'), '/admin-dashboard', 'chart-column')];
    if (ctx.isAdmin) {
      items.push(core('users', t('Users'), '/users', 'user'));
      if (ctx.isWorkspacesActive) items.push(core('workspaces', t('Workspaces'), '/admin/workspaces', 'briefcase'));
      items.push(core('events', t('Events Log'), '/admin/log', 'clipboard-list'));
    }
    sections.push({ key: 'overview', label: t('Overview'), items });
  }

  if (ctx.isAdmin) {
    sections.push({
      key: 'content',
      label: t('Content & Structure'),
      items: [
        core('components', t('Components'), '/admin/components', 'th'),
        core('blocks', t('Content Boxes'), '/admin/blocks', 'box'),
        core('blueprints', t('Blueprints'), '/no-code/blueprints', 'database'),
        core('assets', t('Storage & Assets'), '/assets', 'folder-tree'),
      ],
    });
    sections.push({
      key: 'system',
      label: t('System & Config'),
      items: [
        core('configurations', t('Configurations'), '/configurations', 'gear'),
        core('appearance', t('Appearance'), '/admin/appearance', 'palette'),
        core('plugins', t('Plugins'), '/plugins', 'plug'),
        core('integrations', t('Integrations'), '/integrations', 'link'),
        core('pricing', t('Pricing Plans'), '/admin/pricing-plans', 'tags'),
      ],
    });
  }

  sections.push(...pluginSections(ctx.bottom, 'bottom'));
  return sections;
}

export const flattenNav = (sections: NavSection[]) => sections.flatMap((section) => section.items);

/** The route an item points at is "current" when the path is equal or a parent of the current path. */
export function isActivePath(itemPath: string | undefined, currentPath: string) {
  if (!itemPath) return false;
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

/**
 * Items for the mobile tab bar: the first navigable items of the same model, so it follows whatever
 * pages the configuration and plugins provide. The page the user is on always gets a tab.
 */
export function pickTabs(sections: NavSection[], count: number, currentPath: string): NavItem[] {
  const navigable = flattenNav(sections).filter((item) => item.to);
  const tabs = navigable.slice(0, count);
  const current = navigable.find((item) => isActivePath(item.to, currentPath));
  if (current && !tabs.includes(current) && tabs.length) tabs[tabs.length - 1] = current;
  return tabs;
}

const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Matches every word of the query against the label or the section it lives in. */
export function filterNavItems(sections: NavSection[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const rows = sections.flatMap((section) => section.items.map((item) => ({ item, section: section.label, sectionKey: section.key })));
  if (!words.length) return rows;
  return rows
    .filter(({ item, section }) => {
      const haystack = normalize(`${item.label} ${section}`);
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => Number(normalize(b.item.label).startsWith(words[0])) - Number(normalize(a.item.label).startsWith(words[0])));
}
