import type { IUser } from '@/modules/core/store/types/user';
import { getUserDisplayName } from './display-name';

type ListedUser = Partial<Pick<IUser, '_id' | 'fullName' | 'firstName' | 'lastName' | 'username' | 'email' | 'roles'>> & { lastLogin?: { created?: string | Date } };

/** accounts a plugin signs in with: not people, so the list tucks them away */
export const SERVICE_ROLE = 'plugin';
export const isServiceAccount = (user: ListedUser) => !!user.roles?.includes(SERVICE_ROLE);

const text = (value?: string) => (value || '').toLowerCase();

/** every word typed must be found in the name, username or email */
export function matchesSearch(user: ListedUser, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [getUserDisplayName(user), text(user.username), text(user.email)].join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export interface UsersView {
  /** people, after the search and the role filter */
  people: ListedUser[];
  /** service accounts, after the search (the role filter does not apply to them) */
  services: ListedUser[];
  /** how many people carry each role, for the filter chips */
  roleCounts: Array<{ role: string; count: number }>;
  totalPeople: number;
}

export function buildUsersView<T extends ListedUser>(users: T[], { query = '', roles = [] as string[] }: { query?: string; roles?: string[] } = {}): UsersView & { people: T[]; services: T[] } {
  const people = users.filter((user) => !isServiceAccount(user));
  const counts = new Map<string, number>();
  people.forEach((user) => (user.roles || []).forEach((role) => counts.set(role, (counts.get(role) || 0) + 1)));
  const sorted = (list: T[]) => [...list].sort(byName);
  return {
    people: sorted(people.filter((user) => matchesSearch(user, query) && (!roles.length || (user.roles || []).some((role) => roles.includes(role))))),
    services: sorted(users.filter((user) => isServiceAccount(user) && matchesSearch(user, query))),
    roleCounts: [...counts].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
    totalPeople: people.length,
  };
}

function byName(a: ListedUser, b: ListedUser) {
  return getUserDisplayName(a).localeCompare(getUserDisplayName(b), undefined, { sensitivity: 'base' });
}

export function lastSeen(user: ListedUser): Date | null {
  const value = user.lastLogin?.created;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** under a minute: "just now" reads better than the formatter's "now" in a sentence */
export const isJustNow = (date: Date, now: Date = new Date()) => Math.abs(now.getTime() - date.getTime()) < 60_000;

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 days ago" in the given language; "just now" under a minute */
export function relativeTime(date: Date, now: Date = new Date(), locale?: string): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, 'second');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#d35400', '#34495e', '#16a085', '#27ae60'];

/** the same name always gets the same color */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ROLE_TYPES: Record<string, 'danger' | 'warning' | 'info' | 'success'> = { admin: 'danger', owner: 'danger', editor: 'warning', user: 'info', viewer: 'success' };
export const roleTagType = (role: string) => ROLE_TYPES[role.toLowerCase()] || 'info';
