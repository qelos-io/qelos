import { MockHttpError, type RouteModule } from '../router/router.js';
import { COLLECTION_NAMES, type CollectionName, type MockState } from '../state/mock-state.js';
import { validateSeed } from '../config/resolve.js';
import { generateId } from '../state/ids.js';
import { createPaymentsControls } from '../payments/controls.js';

export const MANAGEMENT_PREFIX = '/__qelos_mock__';

/**
 * Dev-only state management API: `GET state`, `POST reset`, `POST seed` (merge),
 * `PUT collections/:name` (replace), `POST payments/:subscriptionId/pay|fail|cancel` (`mock.payments`) and
 * `GET routes`.
 * `:name` is a collection (`users`, `blueprints`, ...) or `entities.<blueprint>`.
 */
export const managementRoutes: RouteModule = (router, state: MockState) => {
  router.register('GET', `${MANAGEMENT_PREFIX}/state`, () => state.snapshot());

  router.register('POST', `${MANAGEMENT_PREFIX}/reset`, () => {
    state.reset();
    return { ok: true };
  });

  router.register('POST', `${MANAGEMENT_PREFIX}/seed`, async (ctx) => {
    let seed;
    try {
      seed = validateSeed((await ctx.json()) ?? {});
    } catch (e: any) {
      throw new MockHttpError(400, e.message, 'QELOS_MOCK_INVALID_SEED');
    }
    state.seed(seed);
    return { ok: true };
  });

  router.register('PUT', `${MANAGEMENT_PREFIX}/collections/:name`, async (ctx) => {
    const items = await ctx.json();
    if (!Array.isArray(items) || items.some((i) => !i || typeof i !== 'object' || Array.isArray(i))) {
      throw new MockHttpError(400, 'body must be an array of objects', 'QELOS_MOCK_BAD_REQUEST');
    }
    const docs = items.map((i) => ({ ...i, _id: i._id || generateId() }));
    const { name } = ctx.params;
    if (name.startsWith('entities.')) {
      state.entities.replaceBlueprint(name.slice('entities.'.length), docs);
    } else if ((COLLECTION_NAMES as readonly string[]).includes(name)) {
      const col = state.collection(name as CollectionName);
      for (const d of col.list()) col.remove(d._id);
      for (const d of docs) col.insert(d);
    } else {
      throw new MockHttpError(404, `unknown collection: ${name}`, 'QELOS_MOCK_UNKNOWN_COLLECTION');
    }
    return { ok: true, count: docs.length };
  });

  const payments = createPaymentsControls(state);
  router.register('POST', `${MANAGEMENT_PREFIX}/payments/:subscriptionId/:action`, async (ctx) => {
    const { subscriptionId, action } = ctx.params;
    if (!['pay', 'fail', 'cancel'].includes(action)) throw new MockHttpError(404, `unknown payment action: ${action}`);
    if (!state.collection('subscriptions').get(subscriptionId)) throw new MockHttpError(404, 'subscription not found');
    if (action === 'pay') return payments.pay(subscriptionId, (await ctx.json()) || {});
    return payments[action as 'fail' | 'cancel'](subscriptionId);
  });

  router.register('GET', `${MANAGEMENT_PREFIX}/routes`, () => router.list());
};

