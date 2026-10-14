import type { IEvent } from '../../../services/apis/events-service';

// keep in sync with ERROR_EVENT_PATTERN in apps/plugins/server/services/events-overview.ts
const ERROR_PATTERN = /error|fail|exception|denied|timeout|invalid/i;

export type EventSeverity = 'error' | 'normal';

export function getEventSeverity(event: Pick<IEvent, 'kind' | 'eventName'>): EventSeverity {
  return ERROR_PATTERN.test(`${event.kind ?? ''} ${event.eventName ?? ''}`) ? 'error' : 'normal';
}

export function getEventErrorMessage(event: Pick<IEvent, 'metadata'>): string {
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return '';
  }
  const error = metadata.error;
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return typeof metadata.message === 'string' ? metadata.message : '';
}

export function getEventUserLabel(event: Pick<IEvent, 'user'>): string {
  const user = event.user;
  if (!user) {
    return '';
  }
  if (typeof user === 'string') {
    return user;
  }
  return user.username || user.email || user._id || '';
}

export function getEventWorkspaceLabel(event: Pick<IEvent, 'workspace'>): string {
  const workspace = event.workspace;
  if (!workspace) {
    return '';
  }
  return typeof workspace === 'string' ? workspace : workspace.name || workspace._id || '';
}

const FACT_KEYS = ['model', 'provider', 'operation', 'providerKind', 'code', 'status', 'blueprint', 'entity'];

function formatFactValue(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'object') {
    return '';
  }
  return String(value);
}

/** Up to `limit` short "key value" chips summarizing the event's metadata. */
export function getEventFacts(event: Pick<IEvent, 'metadata'>, limit = 3): string[] {
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const facts: string[] = [];
  for (const key of FACT_KEYS) {
    const value = formatFactValue(metadata[key]);
    if (value) {
      facts.push(value);
    }
  }

  const totalTokens = metadata.usage?.total_tokens ?? metadata.totalTokens;
  if (typeof totalTokens === 'number') {
    facts.push(`${totalTokens.toLocaleString()} tokens`);
  }

  return facts.slice(0, limit);
}

export function getEventSummary(event: Pick<IEvent, 'description' | 'metadata'>): string {
  return event.description || getEventErrorMessage(event);
}

export interface EventGroup<T> {
  key: string;
  date: Date;
  items: T[];
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Groups events (already sorted newest first) by local calendar day. */
export function groupEventsByDay<T extends { created: Date | string }>(events: T[]): EventGroup<T>[] {
  const groups: EventGroup<T>[] = [];
  for (const event of events) {
    const date = new Date(event.created);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(event);
    } else {
      groups.push({ key, date, items: [event] });
    }
  }
  return groups;
}

export function getDayLabel(
  date: Date,
  now: Date,
  locale: string | undefined,
  labels: { today: string; yesterday: string },
) {
  if (dayKey(date) === dayKey(now)) {
    return labels.today;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) {
    return labels.yesterday;
  }
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(date: Date | string, now: Date, locale?: string) {
  const diffSeconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(diffSeconds, 'second');
}

/** Events by the same user within `windowMs` of `event`, closest first, excluding itself. */
export function getRelatedEvents(
  event: IEvent,
  events: IEvent[],
  userId: (event: IEvent) => string,
  windowMs = 10 * 60 * 1000,
  limit = 6,
) {
  const id = userId(event);
  if (!id) {
    return [];
  }
  const at = new Date(event.created).getTime();
  return events
    .filter((other) => other._id !== event._id && userId(other) === id)
    .map((other) => ({ other, distance: Math.abs(new Date(other.created).getTime() - at) }))
    .filter(({ distance }) => distance <= windowMs)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ other }) => other);
}
