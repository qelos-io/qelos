/** Listing, searching and describing workspaces, for the admin list and for "my workspaces". */

export interface WorkspaceLike {
  _id?: string;
  name?: string;
  description?: string;
  logo?: string;
  labels?: string[];
  members?: Array<{ user: string; roles?: string[] }>;
  created?: string | Date;
  lastAccessed?: string | Date;
}

export type MyRole = 'admin' | 'manager' | 'member' | 'guest';

/** "no label" as a filter value next to real labels */
export const NO_LABEL = '__none__';

export function workspaceInitials(name?: string): string {
  return (name || '?').trim().slice(0, 2).toUpperCase() || '?';
}

const text = (value?: string) => (value || '').toLowerCase();
const byName = (a: WorkspaceLike, b: WorkspaceLike) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });

function matches(workspace: WorkspaceLike, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [text(workspace.name), text(workspace.description), text(workspace._id), ...(workspace.labels || []).map(text)].join(' ');
  return words.every((word) => haystack.includes(word));
}

/* ---------- admin ---------- */

export function labelCounts(workspaces: WorkspaceLike[]) {
  const counts = new Map<string, number>();
  let unlabeled = 0;
  workspaces.forEach((workspace) => {
    if (!workspace.labels?.length) unlabeled++;
    workspace.labels?.forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
  });
  return {
    labels: [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    unlabeled,
  };
}

/** Every selected label must be on the workspace (selecting more narrows); NO_LABEL matches workspaces without labels. */
export function filterAdminWorkspaces<T extends WorkspaceLike>(workspaces: T[], { query = '', labels = [] as string[] } = {}): T[] {
  return workspaces
    .filter((workspace) => {
      if (!matches(workspace, query)) return false;
      return labels.every((label) => (label === NO_LABEL ? !workspace.labels?.length : !!workspace.labels?.includes(label)));
    })
    .sort(byName);
}

/* ---------- mine ---------- */

export function myRole(workspace: WorkspaceLike, userId?: string): MyRole {
  const member = workspace.members?.find((item) => item.user === userId);
  if (!member) return 'guest';
  if (member.roles?.includes('admin')) return 'admin';
  if (member.roles?.includes('manager')) return 'manager';
  return 'member';
}

export function filterMyWorkspaces<T extends WorkspaceLike>(workspaces: T[], { query = '', role = '', userId = '', activeId = '' } = {}): T[] {
  return workspaces
    .filter((workspace) => matches(workspace, query) && (!role || myRole(workspace, userId) === role))
    .sort((a, b) => Number(b._id === activeId) - Number(a._id === activeId) || byName(a, b));
}

export function myRoleCounts(workspaces: WorkspaceLike[], userId?: string) {
  const counts = new Map<MyRole, number>();
  workspaces.forEach((workspace) => {
    const role = myRole(workspace, userId);
    counts.set(role, (counts.get(role) || 0) + 1);
  });
  const order: MyRole[] = ['admin', 'manager', 'member', 'guest'];
  return order.filter((role) => counts.has(role)).map((role) => ({ role, count: counts.get(role)! }));
}

/** valid email addresses to invite, trimmed and without repeats */
export function cleanInvites<T extends { email?: string }>(invites: T[]): T[] {
  const seen = new Set<string>();
  return invites
    .map((invite) => ({ ...invite, email: (invite.email || '').trim() }))
    .filter((invite) => {
      const key = invite.email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
