import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { LifecycleEvent, on, trigger } from '../../src/lifecycle';

describe('lifecycle events', () => {
  test('a callback receives the payload', () => {
    const seen: unknown[] = [];
    on(LifecycleEvent.configured, (payload) => seen.push(payload));
    const payload = { manifest: { name: 'x' }, config: {} } as any;
    trigger(LifecycleEvent.configured, payload);
    assert.deepEqual(seen, [payload]);
  });

  test('callbacks run in registration order', () => {
    const order: string[] = [];
    on(LifecycleEvent.mounted, () => order.push('first'));
    on(LifecycleEvent.mounted, () => order.push('second'));
    trigger(LifecycleEvent.mounted, {} as any);
    assert.deepEqual(order, ['first', 'second']);
  });

  test('callbacks are one-shot: triggering again does not call them twice', () => {
    let calls = 0;
    on(LifecycleEvent.appMounted, () => calls++);
    trigger(LifecycleEvent.appMounted, {} as any);
    trigger(LifecycleEvent.appMounted, {} as any);
    assert.equal(calls, 1);
  });

  test('events are independent of each other', () => {
    let beforeCreate = 0;
    let beforeMount = 0;
    on(LifecycleEvent.beforeCreate, () => beforeCreate++);
    on(LifecycleEvent.beforeMount, () => beforeMount++);
    trigger(LifecycleEvent.beforeCreate, {} as any);
    assert.deepEqual([beforeCreate, beforeMount], [1, 0]);
  });

  test('a callback can change the payload it is given (hooks like beforeCreate rely on it)', () => {
    on(LifecycleEvent.beforeCreate, (payload: any) => {
      payload.fastifyOptions.logger = true;
    });
    const payload = { fastifyOptions: { logger: false }, config: {}, manifest: {} } as any;
    trigger(LifecycleEvent.beforeCreate, payload);
    assert.equal(payload.fastifyOptions.logger, true);
  });

  test('triggering an event nobody listens to does nothing', () => {
    assert.doesNotThrow(() => trigger(LifecycleEvent.internalAppMounted, {} as any));
  });
});
