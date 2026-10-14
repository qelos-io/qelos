export const ERROR_EVENT_PATTERN = 'error|fail|exception|denied|timeout|invalid';

const MIN_BUCKETS = 6;
const MAX_BUCKETS = 60;
const DEFAULT_BUCKETS = 24;

export function clampBuckets(value: unknown): number {
  const n = Math.round(Number(value) || DEFAULT_BUCKETS);
  return Math.max(MIN_BUCKETS, Math.min(MAX_BUCKETS, n));
}

/**
 * Splits [start, end] into `count` equal buckets. Returns count + 1 ascending
 * boundaries; the last one is end + 1ms so the final event is included.
 */
export function buildBucketBoundaries(start: Date, end: Date, count: number): Date[] {
  const from = start.getTime();
  const span = Math.max(end.getTime() - from, count);
  const step = span / count;
  const boundaries = Array.from({ length: count + 1 }, (_, i) => new Date(Math.round(from + step * i)));
  boundaries[count] = new Date(from + span + 1);
  return boundaries;
}

export interface OverviewBucket {
  start: string;
  end: string;
  count: number;
  errors: number;
}

/** Fills empty buckets so the client always receives `boundaries.length - 1` entries. */
export function mapBuckets(
  boundaries: Date[],
  rows: { _id: Date | string; count: number; errors: number }[],
): OverviewBucket[] {
  const byStart = new Map(rows.map((r) => [new Date(r._id as any).getTime(), r]));
  return boundaries.slice(0, -1).map((start, i) => {
    const row = byStart.get(start.getTime());
    return {
      start: start.toISOString(),
      end: boundaries[i + 1].toISOString(),
      count: row?.count ?? 0,
      errors: row?.errors ?? 0,
    };
  });
}
