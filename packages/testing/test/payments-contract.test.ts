import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import * as rules from '../src/payments/rules.js';

/**
 * Contract between the mock and the real payments service: the service's own functions and controllers
 * (`apps/payments`, with the database models stubbed) next to the mock's.
 */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'payments', 'server');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
/** the database returns dates, the API (and the mock) strings */
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
/** what a mongoose query chain resolves to */
const found = (value: unknown) => () => ({ lean: () => ({ exec: async () => value }) });

const HOUR = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const plans = [
  { _id: 'p1', name: 'Basic', monthlyPrice: 10, yearlyPrice: 100, currency: 'USD' },
  { _id: 'p2', name: 'Euro', monthlyPrice: 20, yearlyPrice: 199, currency: 'EUR' },
  { _id: 'p3', name: 'Dyn', monthlyPrice: 0, yearlyPrice: 0, currency: 'USD', dynamic: true },
];
const subscription = (n: number, status: string, planId: string, billingCycle = 'monthly', age = 48 * HOUR) => ({
  _id: `s${n}`,
  status,
  planId,
  billingCycle,
  billableEntityType: 'user',
  billableEntityId: `u${n}`,
  created: ago(age),
  history: [{ type: 'created', at: ago(age), to: status }],
});

describe('the mock follows the payments service', () => {
  test('the administrator summary', async () => {
    const { buildSubscriptionsSummary, pickAttentionItems } = await load('services/subscriptions-summary');
    const list = [
      subscription(1, 'active', 'p1'),
      subscription(2, 'trialing', 'p2', 'yearly'),
      subscription(3, 'past_due', 'p1', 'yearly', HOUR),
      subscription(4, 'pending', 'p2', 'monthly', HOUR),
      subscription(5, 'pending', 'p1', 'monthly', 72 * HOUR),
      subscription(6, 'canceled', 'p1'),
      subscription(7, 'active', 'p3'),
      subscription(8, 'active', 'gone'),
    ];
    const groups = new Map<string, any>();
    for (const { status, planId, billingCycle } of list) {
      const key = [status, planId, billingCycle].join();
      const group = groups.get(key) ?? { _id: { status, planId, billingCycle }, count: 0 };
      group.count++;
      groups.set(key, group);
    }
    const waiting = list.filter((s) => ['past_due', 'pending'].includes(s.status)).sort((a, b) => a.created.localeCompare(b.created));
    const real = { ...buildSubscriptionsSummary([...groups.values()], plans), attention: pickAttentionItems(waiting) };
    assert.deepEqual(json(rules.summarize(list, plans)), json(real));
  });

  test('the activity timeline', async () => {
    const { buildActivityTimeline } = await load('services/subscription-activity');
    const record = {
      created: ago(9 * HOUR),
      history: [
        { type: 'coupon_applied', at: ago(3 * HOUR), couponCode: 'X' },
        { type: 'status_changed', at: ago(5 * HOUR), from: 'pending', to: 'active' },
        { type: 'canceled', at: ago(HOUR), from: 'active', to: 'canceled' },
        { type: 'something else', at: ago(HOUR) },
      ],
    };
    const invoices = [
      { _id: 'i1', status: 'paid', paidAt: ago(4 * HOUR), created: ago(5 * HOUR), amount: 10, currency: 'USD' },
      { _id: 'i2', status: 'failed', created: ago(2 * HOUR), amount: 10, currency: 'USD', invoiceUrl: 'https://x.test' },
      { _id: 'i3', status: 'unknown', created: ago(HOUR) },
    ];
    assert.deepEqual(json(rules.activityTimeline(record, invoices)), json(buildActivityTimeline(record, invoices)));
  });

  test('coupons: which are refused, how long they last and what they cost', async () => {
    const Coupon = await load('models/coupon');
    const coupons = await load('services/coupons-service');
    const checkout = await load('services/checkout-service');
    const base = { code: 'X', discountType: 'percentage', discountValue: 33, applicablePlanIds: [] as string[], currentRedemptions: 1, maxRedemptions: null };
    const cases = [
      undefined,
      base,
      { ...base, validFrom: ago(-HOUR) },
      { ...base, validUntil: ago(HOUR) },
      { ...base, maxRedemptions: 1 },
      { ...base, maxRedemptions: 2 },
      { ...base, applicablePlanIds: ['other'] },
      { ...base, applicablePlanIds: ['p1'] },
    ];
    for (const coupon of cases) {
      const query = mock.method(Coupon, 'findOne', found(coupon ?? null));
      const real = await coupons.validateCoupon('t', 'X', 'p1').then(
        () => null,
        (error: any) => ({ code: error.code, message: error.message }),
      );
      query.mock.restore();
      assert.deepEqual(rules.couponProblem(coupon, 'p1'), real, JSON.stringify(coupon));
    }
    const from = new Date('2026-01-31T10:00:00Z');
    for (const benefit of [{}, { benefitDurationUnit: 'days', benefitDurationValue: 45 }, { benefitDurationUnit: 'months', benefitDurationValue: 1 }]) {
      assert.deepEqual(rules.benefitEnd(benefit, from), coupons.calculateCouponBenefitEndDate(benefit, from));
    }
    for (const discount of [{ discountType: 'percentage', discountValue: 33 }, { discountType: 'fixed', discountValue: 2.5 }, { discountType: 'fixed', discountValue: 50 }]) {
      for (const benefitEndsAt of [undefined, new Date(ago(HOUR)), new Date(ago(-HOUR))]) {
        assert.equal(rules.discountedPrice(9.99, discount, benefitEndsAt), checkout.calculateDiscountedPrice(9.99, discount, { benefitEndsAt }));
      }
    }
  });

  /** run a real controller and collect what it answers */
  async function real(controller: Function, req: Record<string, unknown>) {
    const answer: { status?: number; body?: any } = {};
    const res: any = { status: (code: number) => ((answer.status = code), res), json: (body: unknown) => ((answer.body = json(body)), res), end: () => {} };
    await controller({ headers: { tenant: 't' }, query: {}, params: {}, body: {}, ...req }, res);
    return answer;
  }

  test('who may read one subscription or invoice', async () => {
    const Subscription = await load('models/subscription');
    const Invoice = await load('models/invoice');
    const subscriptions = await load('controllers/subscriptions');
    const invoices = await load('controllers/invoices');
    const workspace = { _id: 'ws-acme', name: 'Acme', roles: ['member'], labels: [] };
    const mockQelos = createMockQelos({
      logger: () => {},
      seed: {
        personas: [
          { _id: 'u-solo', email: 'solo@x.com', roles: ['user'] },
          { _id: 'u-member', email: 'member@x.com', roles: ['user'], workspaces: [{ _id: 'ws-acme', name: 'Acme' }] },
          { _id: 'u-admin', email: 'admin@x.com', roles: ['admin'], workspaces: [{ _id: 'ws-acme', name: 'Acme' }] },
        ],
        subscriptions: [
          { _id: 'own', billableEntityType: 'user', billableEntityId: 'u-solo' },
          { _id: 'ws', billableEntityType: 'workspace', billableEntityId: 'ws-acme' },
        ],
        invoices: [
          { _id: 'own', billableEntityType: 'user', billableEntityId: 'u-solo' },
          { _id: 'ws', billableEntityType: 'workspace', billableEntityId: 'ws-acme' },
        ],
      },
    });
    const callers = {
      'solo@x.com': { _id: 'u-solo' },
      'member@x.com': { _id: 'u-member', workspace },
      'admin@x.com': { _id: 'u-admin', workspace, isPrivileged: true },
    };
    for (const [email, user] of Object.entries(callers)) {
      for (const id of ['own', 'ws', 'missing']) {
        const owner = id === 'missing' ? null : { _id: id, billableEntityId: id === 'own' ? 'u-solo' : 'ws-acme' };
        for (const [path, model, controller] of [
          ['subscriptions', Subscription, subscriptions.getSubscription],
          ['invoices', Invoice, invoices.getInvoice],
        ] as const) {
          const query = mock.method(model as any, 'findOne', found(owner));
          const expected = await real(controller, { params: { id }, user });
          query.mock.restore();
          const res = await mockQelos.fetch(`/api/${path}/${id}`, { headers: { [PERSONA_HEADER]: email } });
          const label = `${email} ${path}/${id}`;
          assert.equal(res.status, expected.status, label);
          if (res.status !== 200) assert.deepEqual(await res.json(), expected.body, label);
        }
      }
    }
  });

  test('what is refused when creating a plan or a coupon', async () => {
    const plansController = await load('controllers/plans');
    const couponsController = await load('controllers/coupons');
    const mockQelos = createMockQelos({ logger: () => {}, seed: { personas: [{ email: 'admin@x.com', roles: ['admin'] }] } });
    const cases: Array<[string, Function, object]> = [
      ['/api/plans', plansController.createPlan, {}],
      ['/api/plans', plansController.createPlan, { monthlyPrice: 1, yearlyPrice: 2 }],
      ['/api/plans', plansController.createPlan, { name: 'x', monthlyPrice: 1 }],
      ['/api/coupons', couponsController.createCoupon, { code: 'X' }],
      ['/api/coupons', couponsController.createCoupon, { code: 'X', discountType: 'percentage', discountValue: 101 }],
      ['/api/coupons', couponsController.createCoupon, { code: 'X', discountType: 'fixed', discountValue: 1, benefitDurationValue: 2 }],
      ['/api/coupons', couponsController.createCoupon, { code: 'X', discountType: 'fixed', discountValue: 1, benefitDurationUnit: 'days' }],
      ['/api/coupons/validate', couponsController.validateCoupon, {}],
    ];
    for (const [path, controller, body] of cases) {
      const expected = await real(controller, { body, user: { _id: 'u', isPrivileged: true } });
      const res = await mockQelos.fetch(path, { method: 'POST', headers: { [PERSONA_HEADER]: 'admin@x.com' }, body: JSON.stringify(body) });
      assert.deepEqual({ status: res.status, body: await res.json() }, expected, `${path} ${JSON.stringify(body)}`);
    }
  });
});
