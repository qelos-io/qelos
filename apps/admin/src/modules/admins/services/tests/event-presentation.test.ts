import {
  getDayLabel,
  getEventFacts,
  getEventSeverity,
  getEventSummary,
  getRelatedEvents,
  groupEventsByDay,
} from '../event-presentation';

const event = (overrides: Record<string, any> = {}) =>
  ({ _id: 'e1', kind: 'ai_service', eventName: 'token_usage', source: 's', description: '', metadata: {}, created: '2026-03-27T16:24:00', ...overrides }) as any;

describe('event presentation', () => {
  it('flags error-like events', () => {
    expect(getEventSeverity(event())).toBe('normal');
    expect(getEventSeverity(event({ eventName: 'chat_completion_stream_error' }))).toBe('error');
    expect(getEventSeverity(event({ kind: 'payment_failed' }))).toBe('error');
  });

  it('prefers the description and falls back to the error message', () => {
    expect(getEventSummary(event({ description: 'AI token usage' }))).toBe('AI token usage');
    expect(getEventSummary(event({ metadata: { error: { message: 'boom' } } }))).toBe('boom');
  });

  it('extracts short facts from metadata', () => {
    expect(getEventFacts(event({ metadata: { model: 'llama3.1:8b', usage: { total_tokens: 283 } } }))).toEqual([
      'llama3.1:8b',
      '283 tokens',
    ]);
    expect(getEventFacts(event({ metadata: null }))).toEqual([]);
  });

  it('groups consecutive events by local day', () => {
    const groups = groupEventsByDay([
      event({ _id: 'a', created: '2026-03-27T16:00:00' }),
      event({ _id: 'b', created: '2026-03-27T09:00:00' }),
      event({ _id: 'c', created: '2026-03-26T23:00:00' }),
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  });

  it('labels today and yesterday', () => {
    const now = new Date('2026-03-27T12:00:00');
    const labels = { today: 'Today', yesterday: 'Yesterday' };
    expect(getDayLabel(new Date('2026-03-27T01:00:00'), now, 'en-US', labels)).toBe('Today');
    expect(getDayLabel(new Date('2026-03-26T23:00:00'), now, 'en-US', labels)).toBe('Yesterday');
    expect(getDayLabel(new Date('2026-03-20T10:00:00'), now, 'en-US', labels)).toMatch(/Mar 20/);
  });

  it('finds nearby events of the same user', () => {
    const base = event({ _id: 'x', user: 'u1', created: '2026-03-27T16:00:00' });
    const near = event({ _id: 'y', user: 'u1', created: '2026-03-27T16:03:00' });
    const far = event({ _id: 'z', user: 'u1', created: '2026-03-27T18:00:00' });
    const other = event({ _id: 'w', user: 'u2', created: '2026-03-27T16:01:00' });
    const related = getRelatedEvents(base, [base, near, far, other], (e) => (e.user as string) || '');
    expect(related.map((e) => e._id)).toEqual(['y']);
  });
});
