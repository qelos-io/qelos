const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('log command', () => {
  it('parseTime handles units and defaults bare numbers to minutes', async () => {
    const { parseTime } = await import('../../services/log/events.mjs');
    assert.strictEqual(parseTime('30'), 30 * 60 * 1000);
    assert.strictEqual(parseTime('30m'), 30 * 60 * 1000);
    assert.strictEqual(parseTime('2h'), 2 * 60 * 60 * 1000);
    assert.strictEqual(parseTime('45s'), 45 * 1000);
    assert.throws(() => parseTime('abc'));
  });

  it('fetchEvents pages through results and returns oldest-first', async () => {
    const { fetchEvents } = await import('../../services/log/events.mjs');
    const pages = [
      Array.from({ length: 100 }, (_, i) => ({ _id: `a${i}` })),
      [{ _id: 'b0' }],
    ];
    const calls = [];
    const sdk = { events: { getList: async (p) => { calls.push(p); return pages[p.page] || []; } } };
    const result = await fetchEvents(sdk, { kind: 'x' }, new Date(0), new Date(1));
    assert.strictEqual(result.length, 101);
    assert.strictEqual(result[0]._id, 'b0');
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].kind, 'x');
  });
});

describe('log command by id', () => {
  it('list lines start with the id and details print full metadata', async () => {
    const { formatEvent, formatEventDetails } = await import('../../services/log/events.mjs');
    const event = { _id: 'abc123', created: new Date(0), kind: 'k', source: 's', eventName: 'e', description: 'd', metadata: { a: { b: 1 } } };
    assert.ok(formatEvent(event).startsWith('abc123 '));
    assert.deepStrictEqual(JSON.parse(formatEventDetails(event)).metadata, { a: { b: 1 } });
  });
});

describe('log command registration', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf-8');

  it('is registered in the commands index', () => {
    const index = read('commands', 'index.mjs');
    assert.ok(index.includes("import logCommand from './log.mjs'"));
    assert.match(index, /^\s*logCommand,$/m);
  });

  it('declares filters, 30m default time, follow alias and optional id', () => {
    const cmd = read('commands', 'log.mjs');
    assert.ok(cmd.includes("'log [id]'"));
    for (const opt of ['kind', 'source', 'event-name', 'time', 'follow', 'json']) {
      assert.ok(cmd.includes(`'${opt}'`), `missing option ${opt}`);
    }
    assert.ok(cmd.includes("default: '30m'"));
    assert.ok(cmd.includes("alias: 'f'"));
  });

  it('controller fetches by id via sdk.events.getEvent and polls every 5s', () => {
    const ctrl = read('controllers', 'log.mjs');
    assert.ok(ctrl.includes('sdk.events.getEvent(id)'));
    assert.ok(ctrl.includes('setInterval'));
    const svc = read('services', 'log', 'events.mjs');
    assert.ok(svc.includes('FOLLOW_INTERVAL_MS = 5000'));
  });
});

describe('log services edge cases', () => {
  it('parseTime is case-insensitive, supports decimals, rejects empty/negative', async () => {
    const { parseTime } = await import('../../services/log/events.mjs');
    assert.strictEqual(parseTime('1D'), 24 * 60 * 60 * 1000);
    assert.strictEqual(parseTime('1.5h'), 90 * 60 * 1000);
    assert.throws(() => parseTime(''));
    assert.throws(() => parseTime('-5m'));
    assert.throws(() => parseTime('5x'));
  });

  it('fetchEvents sends from/to as ISO strings and stops on an empty first page', async () => {
    const { fetchEvents } = await import('../../services/log/events.mjs');
    const calls = [];
    const sdk = { events: { getList: async (p) => { calls.push(p); return []; } } };
    const result = await fetchEvents(sdk, {}, new Date(0), new Date(1000));
    assert.deepStrictEqual(result, []);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].from, '1970-01-01T00:00:00.000Z');
    assert.strictEqual(calls[0].to, '1970-01-01T00:00:01.000Z');
  });

  it('formatEvent omits the description separator when there is none', async () => {
    const { formatEvent } = await import('../../services/log/events.mjs');
    const line = formatEvent({ _id: 'x', created: new Date(0), kind: 'k', source: 's', eventName: 'e' });
    assert.ok(!line.includes(' - '));
  });
});
