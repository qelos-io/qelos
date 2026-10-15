import { describe, expect, it } from 'vitest';
import { NO_LABEL, cleanInvites, filterAdminWorkspaces, filterMyWorkspaces, labelCounts, myRole, myRoleCounts, workspaceInitials } from '../workspace-presentation';

const list: any[] = [
  { _id: 'a1', name: 'Beta', labels: ['customer'], members: [{ user: 'u1', roles: ['admin', 'member'] }] },
  { _id: 'a2', name: 'alpha', labels: ['customer', 'eu'], members: [{ user: 'u1', roles: ['member'] }] },
  { _id: 'a3', name: 'Gamma', members: [{ user: 'u2', roles: ['manager'] }, { user: 'u1', roles: ['manager'] }] },
  { _id: 'a4', name: 'Delta', description: 'internal tools', labels: [] },
];

describe('admin list', () => {
  it('counts labels and unlabeled workspaces', () => {
    expect(labelCounts(list)).toEqual({ labels: [{ label: 'customer', count: 2 }, { label: 'eu', count: 1 }], unlabeled: 2 });
  });

  it('sorts by name ignoring case and searches name, description, id and labels', () => {
    expect(filterAdminWorkspaces(list).map((w) => w._id)).toEqual(['a2', 'a1', 'a4', 'a3']);
    expect(filterAdminWorkspaces(list, { query: 'internal' }).map((w) => w._id)).toEqual(['a4']);
    expect(filterAdminWorkspaces(list, { query: 'a3' }).map((w) => w._id)).toEqual(['a3']);
    expect(filterAdminWorkspaces(list, { query: 'eu alpha' }).map((w) => w._id)).toEqual(['a2']);
  });

  it('narrows by every selected label, with a "no label" choice', () => {
    expect(filterAdminWorkspaces(list, { labels: ['customer'] }).map((w) => w._id)).toEqual(['a2', 'a1']);
    expect(filterAdminWorkspaces(list, { labels: ['customer', 'eu'] }).map((w) => w._id)).toEqual(['a2']);
    expect(filterAdminWorkspaces(list, { labels: [NO_LABEL] }).map((w) => w._id)).toEqual(['a4', 'a3']);
  });
});

describe('my workspaces', () => {
  it('works out my role', () => {
    expect(myRole(list[0], 'u1')).toBe('admin');
    expect(myRole(list[1], 'u1')).toBe('member');
    expect(myRole(list[2], 'u1')).toBe('manager');
    expect(myRole(list[3], 'u1')).toBe('guest');
  });

  it('puts the active workspace first, then filters by search and role', () => {
    expect(filterMyWorkspaces(list, { userId: 'u1', activeId: 'a3' }).map((w) => w._id)).toEqual(['a3', 'a2', 'a1', 'a4']);
    expect(filterMyWorkspaces(list, { userId: 'u1', role: 'member' }).map((w) => w._id)).toEqual(['a2']);
    expect(filterMyWorkspaces(list, { userId: 'u1', query: 'beta' }).map((w) => w._id)).toEqual(['a1']);
  });

  it('counts the roles I have, in a fixed order', () => {
    expect(myRoleCounts(list, 'u1')).toEqual([
      { role: 'admin', count: 1 }, { role: 'manager', count: 1 }, { role: 'member', count: 1 }, { role: 'guest', count: 1 },
    ]);
  });
});

describe('helpers', () => {
  it('makes initials', () => {
    expect(workspaceInitials('demo ws')).toBe('DE');
    expect(workspaceInitials('  ')).toBe('?');
    expect(workspaceInitials(undefined)).toBe('?');
  });

  it('keeps only valid, unique invite emails', () => {
    expect(cleanInvites([{ email: ' a@b.co ' }, { email: 'A@B.co' }, { email: 'nope' }, { email: '' }, { email: 'c@d.io', name: 'C' } as any])).toEqual([
      { email: 'a@b.co' }, { email: 'c@d.io', name: 'C' },
    ]);
  });
});
