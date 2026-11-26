import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from '../with-timeout';

describe('withTimeout', () => {
  it('returns the result and never reports a timeout afterwards', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let reported = 0;
    const result = await withTimeout(Promise.resolve('done'), 1000, () => (reported++, new Error('late')));
    t.mock.timers.tick(10_000);
    assert.equal(result, 'done');
    assert.equal(reported, 0);
  });

  it('passes on a failure of the work and never reports a timeout afterwards', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let reported = 0;
    await assert.rejects(withTimeout(Promise.reject(new Error('provider down')), 1000, () => (reported++, new Error('late'))), /provider down/);
    t.mock.timers.tick(10_000);
    assert.equal(reported, 0);
  });

  it('rejects with the error of onTimeout, once, when the time runs out', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let reported = 0;
    const pending = withTimeout(new Promise<never>(() => {}), 1000, () => (reported++, new Error('too slow')));
    t.mock.timers.tick(999);
    assert.equal(reported, 0);
    t.mock.timers.tick(1);
    await assert.rejects(pending, /too slow/);
    t.mock.timers.tick(10_000);
    assert.equal(reported, 1);
  });

  it('rejects if onTimeout itself throws', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const pending = withTimeout(new Promise<never>(() => {}), 5, () => {
      throw new Error('could not report');
    });
    t.mock.timers.tick(5);
    await assert.rejects(pending, /could not report/);
  });
});
