import { describe, expect, it } from 'vitest';
import { avatarColor, isJustNow, buildUsersView, initials, isServiceAccount, lastSeen, matchesSearch, relativeTime, roleTagType } from '../user-presentation';

const users: any[] = [
  { _id: '1', firstName: 'Dana', lastName: 'Levy', username: 'dana@x.com', roles: ['admin', 'user'], lastLogin: { created: '2026-01-02T00:00:00Z' } },
  { _id: '2', firstName: 'avi', lastName: 'Cohen', username: 'avi@y.com', roles: ['user'] },
  { _id: '3', username: 'abc@localhost', roles: ['plugin', 'admin'] },
];

describe('search', () => {
  it('matches every word against name, username and email, ignoring case', () => {
    expect(matchesSearch(users[0], 'dana levy')).toBe(true);
    expect(matchesSearch(users[0], 'LEVY x.com')).toBe(true);
    expect(matchesSearch(users[0], 'cohen')).toBe(false);
    expect(matchesSearch(users[0], '  ')).toBe(true);
  });
});

describe('buildUsersView', () => {
  it('splits service accounts from people and sorts by name', () => {
    const view = buildUsersView(users);
    expect(view.people.map((u) => u._id)).toEqual(['2', '1']);
    expect(view.services.map((u) => u._id)).toEqual(['3']);
    expect(view.totalPeople).toBe(2);
    expect(isServiceAccount(users[2])).toBe(true);
  });

  it('counts roles of people only and filters by role and search', () => {
    expect(buildUsersView(users).roleCounts).toEqual([{ role: 'user', count: 2 }, { role: 'admin', count: 1 }]);
    expect(buildUsersView(users, { roles: ['admin'] }).people.map((u) => u._id)).toEqual(['1']);
    expect(buildUsersView(users, { roles: ['admin'] }).services).toHaveLength(1);
    expect(buildUsersView(users, { query: 'cohen' }).people.map((u) => u._id)).toEqual(['2']);
    expect(buildUsersView(users, { query: 'cohen' }).services).toHaveLength(0);
  });
});

describe('time and avatars', () => {
  it('reads the last sign-in', () => {
    expect(lastSeen(users[0])?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(lastSeen(users[1])).toBeNull();
    expect(lastSeen({ lastLogin: { created: 'nope' } })).toBeNull();
  });

  it('says how long ago', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    expect(relativeTime(new Date('2026-01-08T00:00:00Z'), now, 'en')).toBe('2 days ago');
    expect(relativeTime(new Date('2025-10-10T00:00:00Z'), now, 'en')).toBe('3 months ago');
    expect(relativeTime(new Date('2026-01-09T23:59:50Z'), now, 'en')).toBe('now');
  });

  it('knows when a sign-in was just now', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    expect(isJustNow(new Date('2026-01-09T23:59:30Z'), now)).toBe(true);
    expect(isJustNow(new Date('2026-01-09T23:58:00Z'), now)).toBe(false);
  });

  it('makes initials and a stable color', () => {
    expect(initials('dana levy')).toBe('DL');
    expect(initials('Madonna')).toBe('M');
    expect(avatarColor('dana')).toBe(avatarColor('dana'));
    expect(roleTagType('Admin')).toBe('danger');
    expect(roleTagType('custom')).toBe('info');
  });
});
