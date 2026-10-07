import { yellow, blue } from '../utils/logger.mjs';

const PAGE_SIZE = 100;
const MAX_PAGES = 100;
export const FOLLOW_INTERVAL_MS = 5000;

const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

/** Parses "30", "30m", "2h", "1d", "45s" into milliseconds. Bare numbers are minutes. */
export function parseTime(value) {
  const match = /^(\d+(?:\.\d+)?)\s*([smhd]?)$/i.exec(String(value ?? '').trim());
  if (!match) {
    throw new Error(`Invalid --time "${value}". Use a number of minutes or a unit, e.g. 30m, 2h, 1d.`);
  }
  return Number(match[1]) * UNIT_MS[(match[2] || 'm').toLowerCase()];
}

/** Fetches every event in [from, to] (newest-first pages) and returns them oldest-first. */
export async function fetchEvents(sdk, filters, from, to) {
  const events = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await sdk.events.getList({
      ...filters,
      from: from.toISOString(),
      to: to.toISOString(),
      page,
      limit: PAGE_SIZE,
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    events.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return events.reverse();
}

export function formatEvent(event) {
  const time = new Date(event.created).toISOString();
  const head = `${event._id} ${time} ${blue(`[${event.kind}]`)} ${yellow(event.source)} ${event.eventName}`;
  return event.description ? `${head} - ${event.description}` : head;
}

export function formatEventDetails(event) {
  return JSON.stringify(event, null, 2);
}
