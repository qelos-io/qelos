import { describe, expect, it } from 'vitest';
import { activityLevel, countFor, lastSeen, nodeActivities, runLimited, signaturesToTrack } from '../flow-activity';
import { buildFlowGraph, signatureKey, type FlowIntegration } from '../flow-graph';

const sig = (eventName: string, source = 'qelos', kind = 'flow') => ({ source, kind, eventName });
const make = (id: string, listen?: ReturnType<typeof sig>, emit?: ReturnType<typeof sig>): FlowIntegration => ({
  _id: id,
  kind: ['qelos', 'qelos'],
  trigger: { source: 'q', operation: listen ? 'webhook' : 'mcpTool', details: { name: id, ...(listen || {}) } },
  target: { source: 'q', operation: 'x', details: emit ? { triggerResponse: emit } : {} },
});

const graph = buildFlowGraph([make('a', sig('signup', 'auth', 'users'), sig('a.done')), make('b', sig('a.done')), make('c')], { q: { _id: 'q', name: 'Q' } });

describe('activityLevel', () => {
  it('grades by the last day, then the last week', () => {
    expect(activityLevel({ day: 2, week: 5 })).toBe('active');
    expect(activityLevel({ day: 0, week: 5 })).toBe('recent');
    expect(activityLevel({ day: 0, week: 0 })).toBe('quiet');
    expect(activityLevel(undefined)).toBe('quiet');
  });
});

describe('signaturesToTrack', () => {
  it('lists each event once: announced, waited for and shown as a platform event', () => {
    const keys = signaturesToTrack(graph.nodes, graph.edges).map(signatureKey).sort();
    expect(keys).toEqual(['auth|users|signup', 'qelos|flow|a.done']);
  });
});

describe('nodeActivities', () => {
  const activities = { 'auth|users|signup': { day: 1, week: 4, last: '2026-10-14T10:00:00Z' }, 'qelos|flow|a.done': { day: 0, week: 2, last: '2026-10-12T09:00:00Z' } };
  const byId = (id: string) => graph.nodes.find((node) => node.id === id)!;

  it('says what started a listener and what an announcer announced', () => {
    expect(nodeActivities(byId('a'), activities).map((entry) => `${entry.role}:${entry.activity.week}`)).toEqual(['starts-on:4', 'announces:2']);
    expect(nodeActivities(byId('b'), activities).map((entry) => entry.role)).toEqual(['starts-on']);
  });

  it('reports a platform event as received', () => {
    expect(nodeActivities(byId('event:auth|users|signup'), activities)).toEqual([{ role: 'receives', activity: activities['auth|users|signup'] }]);
  });

  it('has nothing to say about an integration with no events', () => {
    expect(nodeActivities(byId('c'), activities)).toEqual([]);
  });

  it('falls back to no activity when nothing was loaded yet', () => {
    expect(nodeActivities(byId('b'), {})[0].activity).toEqual({ day: 0, week: 0 });
  });

  it('finds the most recent time', () => {
    expect(lastSeen(nodeActivities(byId('a'), activities))).toBe('2026-10-14T10:00:00Z');
    expect(lastSeen([])).toBeUndefined();
  });
});

describe('countFor', () => {
  it('reads a period, zero when unknown', () => {
    expect(countFor({ day: 3, week: 9 }, 'week')).toBe(9);
    expect(countFor(undefined, 'day')).toBe(0);
  });
});

describe('runLimited', () => {
  it('keeps result order and never exceeds the limit', async () => {
    let running = 0;
    let peak = 0;
    const results = await runLimited([30, 10, 20, 5, 15], 2, async (ms) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, ms));
      running--;
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40, 10, 30]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('handles nothing to do', async () => {
    expect(await runLimited([], 3, async () => 1)).toEqual([]);
  });
});
