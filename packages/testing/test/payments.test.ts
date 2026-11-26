import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as adminModule from '@qelos/sdk/administrator';
import { createMockSdk } from '../src/sdk/index.js';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

// tsx loads the SDK as CommonJS: the class sits on `default` (twice, depending on the loader)
const loaded: any = adminModule;
const Admin: new (options: any) => any = loaded.default?.default ?? loaded.default ?? loaded;

const personas = [
  { email: 'admin@x.com', password: 'password-1', roles: ['admin'] },
  { email: 'ada@x.com', password: 'password-1', roles: ['user'] },
  { email: 'bob@x.com', password: 'password-1', roles: ['user'] },
  { email: 'member@x.com', password: 'password-1', roles: ['user'], workspaces: [{ _id: 'ws-acme', name: 'Acme' }] },
];
const pricingPlans = [
  { _id: 'basic', name: 'Basic', monthlyPrice: 10, yearlyPrice: 100, sortOrder: 1, externalIds: { paddle: { monthly: 'pri_1' } } },
  { _id: 'pro', name: 'Pro', monthlyPrice: 30, yearlyPrice: 300, sortOrder: 2 },
  { _id: 'custom', name: 'Custom', monthlyPrice: 0, yearlyPrice: 0, dynamic: true, sortOrder: 3 },
  { _id: 'old', name: 'Old', monthlyPrice: 5, yearlyPrice: 50, isActive: false },
];
const coupons = [
  { _id: 'c-half', code: 'HALF', discountType: 'percentage', discountValue: 50, benefitDurationUnit: 'months', benefitDurationValue: 2 },
  { _id: 'c-pro', code: 'PROONLY', discountType: 'fixed', discountValue: 5, applicablePlanIds: ['pro'] },
  { _id: 'c-gone', code: 'GONE', discountType: 'fixed', discountValue: 5, validUntil: '2000-01-01' },
];

function setup(seed: object = {}) {
  const t = createMockSdk({ seed: { personas, pricingPlans, coupons, ...seed } });
  const payments = (persona: string) => (t.as(persona) as any).payments;
  const admin = new Admin({ appUrl: 'http://qelos.mock', fetch: t.mock.fetch, extraHeaders: async () => ({ [PERSONA_HEADER]: 'admin@x.com' }) }).managePayments;
  const call = async (persona: string | null, method: string, path: string, body?: object) => {
    const res = await t.mock.fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...(persona ? { [PERSONA_HEADER]: persona } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  const user = (email: string) => t.mock.state.users.findOne((u) => u.email === email)!;
  return { ...t, ada: payments('ada@x.com'), bob: payments('bob@x.com'), member: payments('member@x.com'), admin, call, user };
}

describe('plans', () => {
  test('the public list has the active ones, in order, with the public fields only', async () => {
    const { call } = setup();
    // public: no credentials needed
    const { body: plans } = await call(null, 'GET', '/api/plans/public');
    assert.deepEqual(plans.map((p: any) => p.name), ['Basic', 'Pro', 'Custom']);
    assert.equal('externalIds' in plans[0] || 'isActive' in plans[0], false);
  });

  test('signed-in users read an active plan; only admins see an inactive one', async () => {
    const { ada, admin, call } = setup();
    assert.equal((await ada.getPlan('pro')).monthlyPrice, 30);
    await assert.rejects(ada.getPlan('old'), /plan not found/);
    assert.equal((await admin.getPlan('old')).name, 'Old');
    assert.equal((await admin.getPlans()).length, 4);
    assert.deepEqual((await admin.getPlans({ isActive: false })).map((p: any) => p.name), ['Old']);
    assert.deepEqual(await call(null, 'GET', '/api/plans/pro'), { status: 401, body: { message: 'authentication required' } });
    assert.deepEqual(await call('ada@x.com', 'GET', '/api/plans'), { status: 401, body: { message: 'insufficient permissions' } });
  });

  test('admins create, change and delete plans', async () => {
    const { admin, ada, call } = setup();
    const plan = await admin.createPlan({ name: 'Team', monthlyPrice: 50, yearlyPrice: 500 });
    assert.deepEqual([plan.currency, plan.isActive, plan.dynamic, plan.features], ['USD', true, false, []]);
    assert.equal((await admin.updatePlan(plan._id, { monthlyPrice: 60 })).monthlyPrice, 60);
    assert.deepEqual(await call('admin@x.com', 'POST', '/api/plans', { name: 'No price' }), {
      status: 400,
      body: { message: 'name, monthlyPrice, and yearlyPrice are required' },
    });
    await admin.deletePlan(plan._id);
    await assert.rejects(admin.getPlan(plan._id));
    await ada.subscribeToPlan('pro', 'monthly');
    const inUse = await call('admin@x.com', 'DELETE', '/api/plans/pro');
    assert.deepEqual([inUse.status, inUse.body.code], [409, 'PLAN_IN_USE']);
  });

  test('plans pulled with the CLI are served', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'qelos-plans-'));
    try {
      mkdirSync(join(dir, 'pricing-plans'));
      writeFileSync(join(dir, 'pricing-plans', 'solo.pricing-plan.json'), JSON.stringify({ name: 'Solo', monthlyPrice: 1, yearlyPrice: 10 }));
      const mock = createMockQelos({ logger: () => {}, artifactsDir: dir });
      const plans: any = await (await mock.fetch('/api/plans/public')).json();
      assert.deepEqual(plans.map((p: any) => p.name), ['Solo']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('checkout and payment', () => {
  test('checkout creates a pending subscription; a payment activates it and bills it', async () => {
    const { ada, mock, user } = setup();
    assert.equal(await ada.getMySubscription(), null);
    const { subscriptionId, checkoutUrl } = await ada.checkout({ planId: 'pro', billingCycle: 'monthly' });
    assert.ok(checkoutUrl.endsWith(subscriptionId));
    assert.equal(await ada.getMySubscription(), null, 'not active before the payment');

    const { subscription } = mock.payments.pay(subscriptionId);
    assert.equal(subscription.status, 'active');
    const mine = await ada.getMySubscription();
    assert.deepEqual([mine._id, mine.billableEntityId, mine.billingCycle], [subscriptionId, user('ada@x.com')._id, 'monthly']);
    assert.ok(mine.currentPeriodEnd > mine.currentPeriodStart);
    const [invoice] = await ada.getInvoices();
    assert.deepEqual([invoice.amount, invoice.status, invoice.currency], [30, 'paid', 'USD']);
    assert.equal((await ada.getInvoice(invoice._id)).subscriptionId, subscriptionId);
    const activity = await ada.getSubscriptionActivity(subscriptionId);
    assert.deepEqual(new Set(activity.map((a: any) => a.kind)), new Set(['subscription.created', 'subscription.status_changed', 'invoice.paid']));
  });

  test('a coupon lowers the price and counts as used when the payment arrives', async () => {
    const { ada, mock } = setup();
    const { subscriptionId } = await ada.checkout({ planId: 'pro', billingCycle: 'yearly', couponCode: 'HALF' });
    const coupon = () => mock.state.collection('coupons').get('c-half')!;
    assert.equal(coupon().currentRedemptions ?? 0, 0);
    const { invoice, subscription } = mock.payments.pay(subscriptionId);
    assert.equal(invoice.amount, 150);
    assert.equal(coupon().currentRedemptions, 1);
    assert.ok(subscription.couponBenefitEndsAt > new Date().toISOString());
  });

  test('coupons the service refuses are refused', async () => {
    const { ada, call } = setup();
    assert.equal((await ada.validateCoupon('PROONLY', 'pro')).discountValue, 5);
    for (const [body, code] of [
      [{ code: 'NOPE' }, 'COUPON_NOT_FOUND'],
      [{ code: 'GONE' }, 'COUPON_EXPIRED'],
      [{ code: 'PROONLY', planId: 'basic' }, 'COUPON_NOT_APPLICABLE'],
    ] as const) {
      const res = await call('ada@x.com', 'POST', '/api/coupons/validate', body);
      assert.deepEqual([res.status, res.body.code], [400, code]);
    }
    const checkout = await call('ada@x.com', 'POST', '/api/checkout', { planId: 'pro', billingCycle: 'monthly', couponCode: 'GONE' });
    assert.deepEqual([checkout.status, checkout.body.code], [400, 'COUPON_EXPIRED']);
  });

  test('a second checkout is refused while a subscription is active, unless it resets it', async () => {
    const { ada, mock, call } = setup();
    const first = await ada.checkout({ planId: 'basic', billingCycle: 'monthly' });
    mock.payments.pay(first.subscriptionId);
    const refused = await call('ada@x.com', 'POST', '/api/checkout', { planId: 'pro', billingCycle: 'monthly' });
    assert.deepEqual([refused.status, refused.body.code, refused.body.existingSubscriptionId], [409, 'ACTIVE_SUBSCRIPTION_EXISTS', first.subscriptionId]);
    const second = await ada.checkout({ planId: 'pro', billingCycle: 'monthly', reset: true });
    assert.equal(mock.state.collection('subscriptions').get(first.subscriptionId)!.status, 'canceled');
    mock.payments.pay(second.subscriptionId);
    assert.equal((await ada.getMySubscription()).planId, 'pro');
  });

  test('a dynamic plan needs an administrator to set the amount first', async () => {
    const { ada, admin, mock, call } = setup();
    const direct = await call('ada@x.com', 'POST', '/api/checkout', { planId: 'custom', billingCycle: 'monthly' });
    assert.equal(direct.body.code, 'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION');
    const pending = await ada.subscribeToPlan('custom', 'monthly');
    assert.equal(pending.status, 'pending');
    const early = await call('ada@x.com', 'POST', '/api/checkout', { subscriptionId: pending._id });
    assert.equal(early.body.code, 'DYNAMIC_AMOUNT_NOT_SET');
    await admin.setSubscriptionDynamicAmount(pending._id, 99);
    await ada.checkout({ subscriptionId: pending._id });
    assert.equal(mock.payments.pay(pending._id).invoice.amount, 99);
  });

  test('only an administrator may set the amount at checkout', async () => {
    const { admin, mock, user, call } = setup();
    const result = await admin.checkout({ planId: 'custom', billingCycle: 'monthly', amount: 42, billableEntityType: 'user', billableEntityId: user('bob@x.com')._id });
    assert.equal(mock.payments.pay(result.subscriptionId).invoice.amount, 42);
    const ignored = await call('ada@x.com', 'POST', '/api/checkout', { planId: 'custom', billingCycle: 'monthly', amount: 1 });
    assert.equal(ignored.body.code, 'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION');
  });

  test('a failed payment leaves the subscription past due, a later one recovers it', async () => {
    const { ada, admin, mock } = setup();
    const { subscriptionId } = await ada.checkout({ planId: 'pro', billingCycle: 'monthly' });
    mock.payments.pay(subscriptionId);
    assert.equal(mock.payments.fail(subscriptionId).status, 'past_due');
    assert.equal(await ada.getMySubscription(), null);
    assert.equal((await admin.getSubscriptionsSummary()).attention[0].status, 'past_due');
    assert.equal(mock.payments.pay(subscriptionId).subscription.status, 'active');
    assert.equal(mock.payments.cancel(subscriptionId).status, 'canceled');
    assert.throws(() => mock.payments.pay('unknown'), /subscription not found/);
  });

  test('a served mock reports payments through its management API', async () => {
    const { ada, mock } = setup();
    const { subscriptionId } = await ada.checkout({ planId: 'pro', billingCycle: 'monthly' });
    const paid = await mock.fetch(`/__qelos_mock__/payments/${subscriptionId}/pay`, { method: 'POST' });
    assert.equal(((await paid.json()) as any).subscription.status, 'active');
    assert.equal((await mock.fetch('/__qelos_mock__/payments/unknown/pay', { method: 'POST' })).status, 404);
  });

  test('the payments configuration is applied', async () => {
    const { admin, call } = setup();
    assert.deepEqual((await admin.getPaymentsConfiguration()).metadata, { isEnabled: false, defaultCurrency: 'USD', gracePeriodDays: 3 });
    const checkout = () => call('ada@x.com', 'POST', '/api/checkout', { planId: 'pro', billingCycle: 'monthly' });
    await admin.updatePaymentsConfiguration({ isEnabled: false });
    assert.deepEqual([(await checkout()).status, (await checkout()).body.code], [500, 'PAYMENTS_NOT_CONFIGURED']);
    await admin.updatePaymentsConfiguration({ isEnabled: true });
    assert.match((await checkout()).body.message, /missing a payment provider/);
    await admin.updatePaymentsConfiguration({ paymentSourceId: 'src1', providerKind: 'sumit' });
    assert.equal((await checkout()).body.code, 'MISSING_REDIRECT_URLS');
    const invalid = await call('admin@x.com', 'PUT', '/api/payments/configuration', { metadata: { successUrl: 'not a url' } });
    assert.deepEqual([invalid.status, invalid.body.code], [400, 'INVALID_PAYMENTS_CONFIGURATION']);
    await admin.updatePaymentsConfiguration({ successUrl: 'https://app.test/ok', cancelUrl: 'https://app.test/no' });
    assert.equal((await checkout()).status, 200);
    assert.equal((await admin.getPaymentsConfiguration()).metadata.providerSourceId, 'src1');
  });
});

describe('who sees what', () => {
  test('users reach their own subscriptions and invoices only', async () => {
    const { ada, bob, mock, call, admin } = setup();
    const { subscriptionId } = await ada.checkout({ planId: 'pro', billingCycle: 'monthly' });
    const { invoice } = mock.payments.pay(subscriptionId);
    assert.deepEqual(await bob.getInvoices(), []);
    assert.deepEqual(await call('bob@x.com', 'GET', `/api/subscriptions/${subscriptionId}`), { status: 403, body: { message: 'access denied' } });
    await assert.rejects(bob.getInvoice(invoice._id), /access denied/);
    await assert.rejects(bob.getSubscriptionActivity(subscriptionId), /access denied/);
    await assert.rejects(bob.cancelSubscription(subscriptionId), /access denied/);
    assert.equal((await admin.getSubscription(subscriptionId))._id, subscriptionId);
    assert.equal((await ada.cancelSubscription(subscriptionId)).status, 'canceled');
    assert.equal((await call('ada@x.com', 'GET', '/api/subscriptions/unknown')).status, 404);
  });

  test('a user checks out for their own accounts only', async () => {
    const { ada, member, call, user } = setup();
    const pending = await ada.subscribeToPlan('pro', 'monthly');
    for (const body of [
      { planId: 'pro', billingCycle: 'monthly', billableEntityType: 'user', billableEntityId: user('ada@x.com')._id },
      { planId: 'pro', billingCycle: 'monthly', billableEntityType: 'workspace', billableEntityId: 'ws-acme' },
      { subscriptionId: pending._id },
    ]) {
      assert.deepEqual(await call('bob@x.com', 'POST', '/api/checkout', body), { status: 403, body: { message: 'access denied' } });
    }
    await member.checkout({ planId: 'pro', billingCycle: 'monthly', billableEntityType: 'workspace', billableEntityId: 'ws-acme' });
  });

  test("a workspace member lists the workspace's records, and is refused a single one, as by the service", async () => {
    const { member, mock } = setup();
    const created = await member.subscribeToPlan('pro', 'monthly');
    assert.deepEqual([created.billableEntityType, created.billableEntityId], ['workspace', 'ws-acme']);
    const { invoice } = mock.payments.pay(created._id);
    assert.equal((await member.getMySubscription())._id, created._id);
    assert.equal((await member.getInvoices()).length, 1);
    await assert.rejects(member.getInvoice(invoice._id), /access denied/);
    await assert.rejects(member.getSubscriptionActivity(created._id), /access denied/);
    await assert.rejects(member.cancelSubscription(created._id), /access denied/);
  });
});

describe('administration', () => {
  test('subscriptions: create, list, summary, workspaces and coupons', async () => {
    const { admin } = setup();
    const active = await admin.createSubscription({ planId: 'pro', billingCycle: 'monthly', billableEntityType: 'workspace', billableEntityId: 'ws-1' });
    assert.equal(active.status, 'active', 'without a status the service creates it active');
    await admin.createSubscription({ planId: 'basic', billingCycle: 'yearly', billableEntityType: 'user', billableEntityId: 'u-1' });
    assert.equal((await admin.getSubscriptions()).length, 2);
    assert.equal((await admin.getSubscriptions({ billableEntityType: 'user' })).length, 1);

    const summary = await admin.getSubscriptionsSummary();
    assert.deepEqual([summary.live, summary.byStatus.active, summary.mrr], [2, 2, [{ currency: 'USD', amount: 38.33 }]]);

    assert.equal((await admin.setSubscriptionCoupon(active._id, 'HALF')).couponId, 'c-half');
    const [listed] = await admin.getWorkspaceSubscriptions();
    assert.equal(listed.planId.name, 'Pro');
    assert.deepEqual(listed.couponId, { _id: 'c-half', code: 'HALF', discountType: 'percentage', discountValue: 50 , currency: 'USD' });
    assert.equal('couponId' in (await admin.setSubscriptionCoupon(active._id, null)), false);
    await assert.rejects(admin.setSubscriptionCoupon(active._id, 'NOPE'), /coupon not found/);
  });

  test('coupons: create, change and deactivate', async () => {
    const { admin, call } = setup();
    const coupon = await admin.createCoupon({ code: 'NEW', discountType: 'percentage', discountValue: 10 });
    assert.deepEqual([coupon.currentRedemptions, coupon.maxRedemptions, coupon.isActive], [0, null, true]);
    assert.equal((await admin.updateCoupon(coupon._id, { discountValue: 20 })).discountValue, 20);
    assert.equal((await admin.deleteCoupon(coupon._id)).isActive, false);
    assert.equal((await admin.getCoupon(coupon._id)).isActive, false);
    assert.equal((await admin.getCoupons({ isActive: false })).length, 1);
    const duplicate = await call('admin@x.com', 'POST', '/api/coupons', { code: 'HALF', discountType: 'fixed', discountValue: 1 });
    assert.deepEqual(duplicate, { status: 400, body: { message: 'a coupon with this code already exists' } });
    assert.equal((await call('ada@x.com', 'GET', '/api/coupons')).status, 401);
  });
});
