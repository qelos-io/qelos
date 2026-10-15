import { signatureKey, type EventSignature, type FlowEdge, type FlowNodeData } from './flow-graph';

/** What the platform recorded about one event signature. */
export interface Activity {
  day: number;
  week: number;
  /** ISO time of the most recent event, if any in the last month */
  last?: string;
}

export type ActivityLevel = 'active' | 'recent' | 'quiet';

export const EMPTY_ACTIVITY: Activity = { day: 0, week: 0 };

/** Active in the last day, recently (last week), or quiet. */
export function activityLevel(activity?: Activity): ActivityLevel {
  if (!activity) return 'quiet';
  if (activity.day > 0) return 'active';
  return activity.week > 0 ? 'recent' : 'quiet';
}

export type ActivityMap = Record<string, Activity>;

/** The events the canvas wants numbers for: what integrations announce and what they wait for. */
export function signaturesToTrack(nodes: FlowNodeData[], edges: Pick<FlowEdge, 'signature'>[]): EventSignature[] {
  const seen = new Map<string, EventSignature>();
  for (const node of nodes) {
    if (node.type === 'integration') {
      if (node.emits) seen.set(signatureKey(node.emits), node.emits);
      if (node.trigger.event) seen.set(signatureKey(node.trigger.event), node.trigger.event);
    } else {
      seen.set(signatureKey(node.signature), node.signature);
    }
  }
  for (const edge of edges) seen.set(signatureKey(edge.signature), edge.signature);
  return [...seen.values()];
}

export type NodeActivity = { role: 'announces' | 'starts-on' | 'receives'; activity: Activity };

/**
 * What to tell about a node. An integration that waits for an event is "started" by it; one that announces an event
 * has "announced" it. When it does both, the announcing side is the one that shows what it did.
 */
export function nodeActivities(node: FlowNodeData, activities: ActivityMap): NodeActivity[] {
  if (node.type === 'event') return [{ role: 'receives', activity: activities[signatureKey(node.signature)] ?? EMPTY_ACTIVITY }];
  const result: NodeActivity[] = [];
  if (node.trigger.event) result.push({ role: 'starts-on', activity: activities[signatureKey(node.trigger.event)] ?? EMPTY_ACTIVITY });
  if (node.emits) result.push({ role: 'announces', activity: activities[signatureKey(node.emits)] ?? EMPTY_ACTIVITY });
  return result;
}

/** The most recent time among a node's activities, to dim a flow that has gone quiet. */
export function lastSeen(items: NodeActivity[]): string | undefined {
  return items.map((item) => item.activity.last).filter((value): value is string => !!value).sort().at(-1);
}

/** "3 in 24h", "12 this week", "none this week" for a period. */
export function countFor(activity: Activity | undefined, period: 'day' | 'week'): number {
  return activity?.[period] ?? 0;
}

/** Runs the given tasks with at most `limit` in flight, keeping the order of the results. */
export async function runLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
