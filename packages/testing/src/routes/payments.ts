import { randomBytes } from 'node:crypto';
import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate, type AuthContext } from '../auth/authenticate.js';
import { isPrivilegedUser } from '../auth/accounts.js';
import { createPaymentsStore, PaymentsError } from '../payments/store.js';
import * as rules from '../payments/rules.js';

/**
 * `sdk.payments` and `sdk.managePayments`, following `apps/payments`: the same callers, status codes, bodies and
 * messages. There is no payment provider: `mock.payments` reports what one would.
 */

const CONFIG_KEY = 'payments-configuration';
const PUBLIC_PLAN_FIELDS = ['_id', 'name', 'description', 'features', 'monthlyPrice', 'yearlyPrice', 'currency', 'sortOrder', 'limits', 'metadata', 'dynamic'];
const PLAN_FIELDS = ['name', 'description', 'features', 'monthlyPrice', 'yearlyPrice', 'currency', 'isActive', 'sortOrder', 'dynamic', 'limits', 'externalIds', 'metadata'];
const COUPON_FIELDS = ['code', 'discountType', 'discountValue', 'currency', 'maxRedemptions', 'validFrom', 'validUntil', 'benefitDurationUnit', 'benefitDurationValue', 'applicablePlanIds', 'isActive'];
const CHECKOUT_STATUS: Record<string, number> = {
  PLAN_NOT_FOUND: 404,
  PLAN_NOT_ACTIVE: 400,
  DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION: 400,
  DYNAMIC_AMOUNT_NOT_SET: 400,
  DYNAMIC_PLAN_UNSUPPORTED_PROVIDER: 400,
  SUBSCRIPTION_NOT_PENDING: 400,
  ACTIVE_SUBSCRIPTION_EXISTS: 409,
  PAYMENTS_NOT_CONFIGURED: 500,
  MISSING_REDIRECT_URLS: 400,
  INVALID_CHECKOUT_AMOUNT: 400,
  COUPON_NOT_FOUND: 400,
  COUPON_EXPIRED: 400,
  COUPON_NOT_YET_VALID: 400,
  COUPON_MAX_REDEMPTIONS: 400,
  COUPON_NOT_APPLICABLE: 400,
};

const only = (source: Record<string, any>, fields: string[]) =>
  Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));

type Handler = (ctx: RouteContext, auth: AuthContext) => unknown;

export function paymentRoutes(router: Router, state: MockState) {
  const store = createPaymentsStore(state);
  const message = (text: string, status: number, code?: string) => jsonResponse({ code, message: text }, status);
  const failure = (e: unknown) => {
    if (e instanceof PaymentsError) return e;
    throw e;
  };

  const signedIn = (handler: Handler) => (ctx: RouteContext) => {
    const auth = authenticate(ctx.request, state);
    return auth ? handler(ctx, auth) : message('authentication required', 401);
  };
  const admin = (handler: Handler) => (ctx: RouteContext) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return message('authentication required', 401);
    return isPrivilegedUser(auth.user) ? handler(ctx, auth) : message('insufficient permissions', 401);
  };

  /** who lists and subscriptions are billed to: the active workspace, else the user */
  const entityOf = (auth: AuthContext) => auth.workspace?._id ?? auth.user._id;
  /**
   * Whether a non-admin may touch one record. The service compares the record's owner with the whole workspace object,
   * so a non-admin with an active workspace is refused even for the workspace's own records.
   */
  const mayAccess = (auth: AuthContext, record: Doc) =>
    isPrivilegedUser(auth.user) || (!auth.workspace && record.billableEntityId === auth.user._id);

  /** a record by id for a signed-in caller: 404 when unknown, 403 when it is not theirs */
  const owned = (find: (id: string) => Doc | undefined, param: string, notFound: string, handler: (record: Doc, ctx: RouteContext) => unknown) =>
    signedIn((ctx, auth) => {
      const record = find(ctx.params[param]);
      if (!record) return message(notFound, 404);
      if (!mayAccess(auth, record)) return message('access denied', 403);
      return handler(record, ctx);
    });

  const filters = (ctx: RouteContext, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, ctx.query.get(k) || undefined]));
  const activeFilter = (ctx: RouteContext) => (ctx.query.has('isActive') ? { isActive: ctx.query.get('isActive') === 'true' } : {});

  // ---------------------------------------------------------------- plans
  const bySortOrder = (a: Doc, b: Doc) => a.sortOrder - b.sortOrder;

  router.register('GET', '/api/plans/public', () => store.plans.list({ isActive: true }).sort(bySortOrder).map((p) => only(p, PUBLIC_PLAN_FIELDS)));
  router.register('GET', '/api/plans', admin((ctx) => store.plans.list(activeFilter(ctx)).sort(bySortOrder)));
  router.register('GET', '/api/plans/:planId', signedIn((ctx, auth) => {
    const plan = store.plans.get(ctx.params.planId);
    if (!plan) return message('failed to load plan', 404);
    return isPrivilegedUser(auth.user) || plan.isActive ? plan : message('plan not found', 404);
  }));
  const negativePrice = (data: Record<string, any>) => Number(data.monthlyPrice) < 0 || Number(data.yearlyPrice) < 0;
  router.register('POST', '/api/plans', admin(async (ctx) => {
    const data = only((await ctx.json()) ?? {}, PLAN_FIELDS);
    if (!data.name) return message('name is required', 400);
    if (data.dynamic !== true && (data.monthlyPrice == null || data.yearlyPrice == null)) {
      return message('name, monthlyPrice, and yearlyPrice are required', 400);
    }
    if (negativePrice(data)) return message('Plan validation failed: price', 500);
    return store.collection('pricingPlans').insert(
      rules.withPlanDefaults({ monthlyPrice: 0, yearlyPrice: 0, ...data, tenant: state.settings.tenantId, created: new Date().toISOString() }),
    );
  }));
  router.register('PUT', '/api/plans/:planId', admin(async (ctx) => {
    const changes = only((await ctx.json()) ?? {}, PLAN_FIELDS);
    const plan = store.plans.get(ctx.params.planId);
    if (!plan) return message('failed to update plan', 404);
    return rules.withPlanDefaults(store.collection('pricingPlans').update(plan._id, changes)!);
  }));
  router.register('DELETE', '/api/plans/:planId', admin((ctx) => {
    const id = ctx.params.planId;
    if (store.subscriptions.list({ planId: id }).length) return message('plan has subscriptions; deactivate it instead', 409, 'PLAN_IN_USE');
    const plan = store.plans.get(id);
    if (!plan) return message('failed to delete plan', 404, 'PLAN_NOT_FOUND');
    store.collection('pricingPlans').remove(plan._id);
    for (const coupon of store.coupons.list()) {
      if (!coupon.applicablePlanIds.includes(plan._id)) continue;
      store.collection('coupons').update(coupon._id, { applicablePlanIds: coupon.applicablePlanIds.filter((p: string) => p !== plan._id) });
    }
    return plan;
  }));

  // ---------------------------------------------------------------- coupons
  router.register('POST', '/api/coupons/validate', signedIn(async (ctx) => {
    const { code, planId } = (await ctx.json()) ?? {};
    if (!code) return message('coupon code is required', 400);
    try {
      return store.usableCoupon(code, planId);
    } catch (e) {
      const error = failure(e);
      return message(error.message, 400, error.code);
    }
  }));
  router.register('GET', '/api/coupons', admin((ctx) => store.coupons.list(activeFilter(ctx))));
  router.register('GET', '/api/coupons/:couponId', admin((ctx) => store.coupons.get(ctx.params.couponId) ?? message('failed to load coupon', 404)));
  router.register('POST', '/api/coupons', admin(async (ctx) => {
    const data = only((await ctx.json()) ?? {}, COUPON_FIELDS);
    const invalid = (text: string) => message(text, 400);
    if (!data.code || !data.discountType || data.discountValue == null) return invalid('code, discountType, and discountValue are required');
    if (data.discountType === 'percentage' && (data.discountValue < 0 || data.discountValue > 100)) return invalid('percentage discount must be between 0 and 100');
    if (data.benefitDurationUnit != null || data.benefitDurationValue != null) {
      if (!['days', 'months'].includes(data.benefitDurationUnit)) return invalid('benefitDurationUnit must be "days" or "months"');
      if (data.benefitDurationValue == null || data.benefitDurationValue <= 0) return invalid('benefitDurationValue must be a positive number');
    }
    if (store.coupons.list({ code: data.code }).length) return invalid('a coupon with this code already exists');
    if (!['percentage', 'fixed'].includes(data.discountType) || data.discountValue < 0) return message('Coupon validation failed', 500);
    return store.collection('coupons').insert(
      rules.withCouponDefaults({ ...data, maxRedemptions: data.maxRedemptions || null, tenant: state.settings.tenantId, created: new Date().toISOString() }),
    );
  }));
  const updateCoupon = (ctx: RouteContext, changes: Record<string, unknown>, notFound: string) => {
    const coupon = store.coupons.get(ctx.params.couponId);
    if (!coupon) return message(notFound, 404);
    if (changes.code && store.coupons.list({ code: changes.code }).some((c) => c._id !== coupon._id)) return message('E11000 duplicate key error', 500);
    return rules.withCouponDefaults(store.collection('coupons').update(coupon._id, changes)!);
  };
  router.register('PUT', '/api/coupons/:couponId', admin(async (ctx) => updateCoupon(ctx, only((await ctx.json()) ?? {}, COUPON_FIELDS), 'failed to update coupon')));
  // deleting a coupon deactivates it
  router.register('DELETE', '/api/coupons/:couponId', admin((ctx) => updateCoupon(ctx, { isActive: false }, 'failed to deactivate coupon')));

  // ---------------------------------------------------------------- subscriptions
  router.register('GET', '/api/subscriptions', signedIn((ctx, auth) => {
    const wanted = filters(ctx, 'billableEntityType', 'billableEntityId', 'status');
    if (!isPrivilegedUser(auth.user)) wanted.billableEntityId = entityOf(auth);
    return store.subscriptions.list(wanted);
  }));
  router.register('GET', '/api/subscriptions/me', signedIn((_ctx, auth) =>
    jsonResponse(store.activeSubscription(auth.workspace ? 'workspace' : 'user', entityOf(auth)) ?? null),
  ));
  router.register('GET', '/api/subscriptions/summary', admin((ctx) =>
    rules.summarize(store.subscriptions.list(filters(ctx, 'billableEntityType')), store.plans.list()),
  ));
  router.register('GET', '/api/subscriptions/workspaces', admin((ctx) =>
    store.subscriptions
      .list({ billableEntityType: 'workspace', ...filters(ctx, 'billableEntityId', 'planId', 'status') })
      .map((subscription) => {
        const coupon = subscription.couponId && store.coupons.get(subscription.couponId);
        return {
          ...subscription,
          planId: store.plans.get(subscription.planId) ?? null,
          ...(subscription.couponId
            ? { couponId: coupon ? only(coupon, ['_id', 'code', 'discountType', 'discountValue', 'currency']) : null }
            : {}),
        };
      }),
  ));
  const subscriptionById = (id: string) => store.subscriptions.get(id);
  router.register('GET', '/api/subscriptions/:id', owned(subscriptionById, 'id', 'failed to load subscription', (s) => s));
  router.register('GET', '/api/subscriptions/:id/activity', owned(subscriptionById, 'id', 'failed to load subscription activity', (s) =>
    rules.activityTimeline(s, store.invoices.list({ subscriptionId: s._id })),
  ));
  router.register('POST', '/api/subscriptions', signedIn(async (ctx, auth) => {
    let data = (await ctx.json()) ?? {};
    if (!isPrivilegedUser(auth.user)) {
      const { planId, billingCycle, couponCode } = data;
      if (!planId || !billingCycle) return message('planId and billingCycle are required', 400);
      const billableEntityType = auth.workspace ? 'workspace' : 'user';
      data = { planId, billingCycle, couponCode, billableEntityType, billableEntityId: entityOf(auth), status: 'pending' };
    }
    try {
      return store.createSubscription(data);
    } catch (e) {
      return message(failure(e).message || 'failed to create subscription', 500);
    }
  }));
  router.register('PUT', '/api/subscriptions/:id/dynamic-amount', admin(async (ctx) => {
    const { amount } = (await ctx.json()) ?? {};
    if (typeof amount !== 'number' || amount <= 0) return message('amount must be a positive number', 400);
    const subscription = subscriptionById(ctx.params.id);
    if (!subscription) return message('failed to set dynamic amount', 404, 'SUBSCRIPTION_NOT_FOUND');
    return store.collection('subscriptions').update(subscription._id, { dynamicAmount: amount });
  }));
  router.register('PUT', '/api/subscriptions/:id/coupon', admin(async (ctx) => {
    const { couponCode } = (await ctx.json()) ?? {};
    if (couponCode != null && typeof couponCode !== 'string') return message('couponCode must be a string or null', 400);
    const failed = (status: number, code?: string, text = 'failed to set subscription coupon') => message(text, status, code);
    const subscription = subscriptionById(ctx.params.id);
    if (!subscription) return failed(404, 'SUBSCRIPTION_NOT_FOUND');
    const update = (changes: Record<string, unknown>, history = subscription.history) =>
      store.collection('subscriptions').update(subscription._id, { ...changes, history });

    if (!couponCode) {
      const history = subscription.couponId ? rules.addHistory(subscription.history, rules.couponEntry(null)) : subscription.history;
      return update({ couponId: undefined, couponBenefitEndsAt: undefined }, history);
    }
    try {
      const coupon = store.usableCoupon(couponCode, String(subscription.planId));
      if (subscription.couponId === coupon._id) return subscription;
      const redeemed = ['active', 'trialing'].includes(subscription.status) ? store.redeem(coupon._id) : undefined;
      const until = redeemed && rules.benefitEnd(redeemed);
      return update(
        { couponId: coupon._id, couponBenefitEndsAt: until ? until.toISOString() : undefined },
        rules.addHistory(subscription.history, rules.couponEntry(couponCode)),
      );
    } catch (e) {
      const error = failure(e);
      return failed(error.code === 'COUPON_NOT_FOUND' ? 404 : 400, error.code, error.message);
    }
  }));
  router.register('PUT', '/api/subscriptions/:id/cancel', owned(subscriptionById, 'id', 'failed to cancel subscription', (s) => store.setStatus(s._id, 'canceled')));

  // ---------------------------------------------------------------- checkout
  /** The configured provider. With no configuration in the mock, one that accepts every checkout. */
  function provider(): { providerKind?: string; providerSourceId?: string; successUrl?: string; cancelUrl?: string } {
    const record = state.configurations.findOne((c) => c.key === CONFIG_KEY);
    if (!record) return {};
    const notConfigured = (text: string) => new PaymentsError('PAYMENTS_NOT_CONFIGURED', text);
    const metadata = record.metadata;
    if (!metadata) {
      throw notConfigured(`Payments configuration "${CONFIG_KEY}" exists but has no metadata. Re-save it in Admin → Pricing Plans → Configuration.`);
    }
    if (metadata.isEnabled === false) {
      throw notConfigured('Payments are disabled in payments-configuration. Enable them in Admin → Pricing Plans → Configuration.');
    }
    const providerSourceId = metadata.providerSourceId || metadata.paymentSourceId;
    if (!providerSourceId) {
      throw notConfigured('Payments configuration is missing a payment provider integration source. Select a provider in Admin → Pricing Plans → Configuration.');
    }
    return { providerSourceId, providerKind: metadata.providerKind, successUrl: metadata.successUrl, cancelUrl: metadata.cancelUrl };
  }

  function startCheckout(params: Record<string, any>) {
    const existing = params.subscriptionId ? store.existing(params.subscriptionId) : undefined;
    if (existing && existing.status !== 'pending') throw new PaymentsError('SUBSCRIPTION_NOT_PENDING', 'Subscription is not in pending status');
    const plan = store.plans.get(existing ? existing.planId : params.planId);
    if (!plan) throw new PaymentsError('PLAN_NOT_FOUND');
    if (!existing && plan.dynamic) {
      throw new PaymentsError('DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION', 'Dynamic plans require a pre-created subscription; ask an admin to set the amount first');
    }
    if (!plan.isActive) throw new PaymentsError('PLAN_NOT_ACTIVE', 'This plan is not currently available');

    const billingCycle = existing?.billingCycle ?? params.billingCycle;
    const billableEntityType = existing?.billableEntityType ?? params.billableEntityType;
    const billableEntityId = existing?.billableEntityId ?? params.billableEntityId;
    if (plan.dynamic && !(existing!.dynamicAmount > 0)) {
      throw new PaymentsError('DYNAMIC_AMOUNT_NOT_SET', 'Admin must set the dynamic amount on this subscription before checkout');
    }
    const price: number = plan.dynamic ? existing!.dynamicAmount : billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const coupon = params.couponCode ? store.usableCoupon(params.couponCode, plan._id) : undefined;
    const finalPrice = coupon
      ? rules.discountedPrice(price, coupon, existing?.couponId === coupon._id ? existing!.couponBenefitEndsAt : undefined)
      : price;

    const active = store.activeSubscription(billableEntityType, billableEntityId);
    if (active) {
      if (!params.reset) {
        throw new PaymentsError('ACTIVE_SUBSCRIPTION_EXISTS', 'An active subscription already exists', { existingSubscriptionId: active._id });
      }
      store.setStatus(active._id, 'canceled');
    }

    const config = provider();
    if (plan.dynamic && config.providerKind && config.providerKind !== 'sumit') {
      throw new PaymentsError(
        'DYNAMIC_PLAN_UNSUPPORTED_PROVIDER',
        'Dynamic pricing plans require the Sumit payment provider (Paddle/PayPal use fixed catalog prices).',
      );
    }
    if (config.providerKind === 'sumit' && !((params.successUrl || config.successUrl) && (params.cancelUrl || config.cancelUrl))) {
      throw new PaymentsError(
        'MISSING_REDIRECT_URLS',
        'Sumit checkout requires successUrl and cancelUrl. Configure them in Admin → Pricing Plans → Configuration or pass them in the checkout request.',
      );
    }
    if (finalPrice <= 0) throw new PaymentsError('INVALID_CHECKOUT_AMOUNT', 'Checkout amount must be greater than zero');

    const changes = {
      externalSubscriptionId: `mock_sub_${randomBytes(8).toString('hex')}`,
      providerId: config.providerSourceId,
      providerKind: config.providerKind,
      ...(coupon ? { couponId: coupon._id } : {}),
      metadata: { ...existing?.metadata, originalPrice: price, finalPrice, couponCode: params.couponCode },
    };
    const subscription = existing
      ? store.setStatus(existing._id, 'pending', changes)
      : store.createSubscription({ planId: plan._id, billableEntityType, billableEntityId, billingCycle, status: 'pending', ...changes });
    return { subscriptionId: subscription._id, checkoutUrl: `https://checkout.qelos.mock/${subscription._id}` };
  }

  /** a regular user checks out for their own user or active workspace only, however the account is given */
  function mayCheckOut(auth: AuthContext, body: Record<string, any>): boolean {
    const own = (type: unknown, id: unknown) => {
      const account = type === 'user' ? auth.user._id : type === 'workspace' ? auth.workspace?._id : undefined;
      return !!account && id === account;
    };
    if (body.subscriptionId) {
      if (typeof body.subscriptionId !== 'string') return false;
      const subscription = store.existing(body.subscriptionId);
      return own(subscription.billableEntityType, subscription.billableEntityId);
    }
    const type = body.billableEntityType || 'user';
    if (type !== 'user' && type !== 'workspace') return false;
    return !body.billableEntityId || own(type, body.billableEntityId);
  }

  router.register('POST', '/api/checkout', signedIn(async (ctx, auth) => {
    const body = (await ctx.json()) ?? {};
    const { subscriptionId, planId, billingCycle } = body;
    if (!subscriptionId && !planId) return message('subscriptionId or planId is required', 400);
    if (billingCycle && !rules.BILLING_CYCLES.includes(billingCycle)) return message('billingCycle must be monthly or yearly', 400);
    const billableEntityType = body.billableEntityType || 'user';
    const billableEntityId = body.billableEntityId || (billableEntityType === 'user' ? auth.user._id : auth.workspace?._id);
    const privileged = isPrivilegedUser(auth.user);
    // only an administrator may set the amount; with it, the pending subscription is created here
    const amount = privileged ? body.amount : undefined;
    const params = { ...body, billableEntityType, billableEntityId };
    try {
      if (!privileged && !mayCheckOut(auth, body)) return message('access denied', 403);
      if (!subscriptionId) {
        if (!billingCycle) return message('billingCycle is required', 400);
        if (!billableEntityId) return message('Could not determine billable entity', 400);
      }
      if (!subscriptionId && amount) {
        params.subscriptionId = store.createSubscription({ planId, billingCycle, billableEntityType, billableEntityId, status: 'pending', dynamicAmount: amount })._id;
      }
      return startCheckout({ ...params, reset: body.reset === true });
    } catch (e) {
      const error = failure(e);
      return jsonResponse(
        { code: error.code, message: error.message || 'checkout failed', ...error.details },
        CHECKOUT_STATUS[error.code ?? ''] || 500,
      );
    }
  }));
  router.register('PUT', '/api/checkout/:subscriptionId/cancel', signedIn((ctx, auth) => {
    const subscription = subscriptionById(ctx.params.subscriptionId);
    if (!subscription) return message('cancellation failed', 404, 'SUBSCRIPTION_NOT_FOUND');
    if (!mayAccess(auth, subscription)) return message('access denied', 403);
    return store.setStatus(subscription._id, 'canceled');
  }));

  // ---------------------------------------------------------------- invoices
  router.register('GET', '/api/invoices', signedIn((ctx, auth) => {
    const wanted = filters(ctx, 'billableEntityType', 'billableEntityId', 'status');
    if (!isPrivilegedUser(auth.user)) wanted.billableEntityId = entityOf(auth);
    return store.invoices.list(wanted);
  }));
  router.register('GET', '/api/invoices/:id', owned((id) => store.invoices.get(id), 'id', 'failed to load invoice', (invoice) => invoice));

  // ---------------------------------------------------------------- configuration
  /** the service's defaults and checks; throws on a redirect URL that is not http(s) */
  function normalizeConfiguration(metadata: Record<string, any>) {
    const url = (field: 'successUrl' | 'cancelUrl') => {
      const value = typeof metadata[field] === 'string' ? metadata[field].trim() : '';
      if (!value) return undefined;
      if (!URL.canParse(value) || !['http:', 'https:'].includes(new URL(value).protocol)) {
        throw new PaymentsError('INVALID_PAYMENTS_CONFIGURATION', `${field} must be a valid absolute URL`);
      }
      return value;
    };
    const source = metadata.paymentSourceId || metadata.providerSourceId;
    return {
      ...metadata,
      isEnabled: metadata.isEnabled ?? false,
      defaultCurrency: metadata.defaultCurrency ?? 'USD',
      gracePeriodDays: metadata.gracePeriodDays ?? 3,
      successUrl: url('successUrl'),
      cancelUrl: url('cancelUrl'),
      ...(source ? { paymentSourceId: source, providerSourceId: source } : {}),
    };
  }
  const configuration = () => state.configurations.findOne((c) => c.key === CONFIG_KEY);

  router.register('GET', '/api/payments/configuration', admin(() => ({ key: CONFIG_KEY, metadata: normalizeConfiguration(configuration()?.metadata ?? {}) })));
  router.register('PUT', '/api/payments/configuration', admin(async (ctx) => {
    const body = (await ctx.json()) ?? {};
    const current = configuration();
    try {
      const metadata = normalizeConfiguration({ ...current?.metadata, ...(body.metadata || body) });
      if (current) state.configurations.update(current._id, { metadata });
      else state.configurations.insert({ key: CONFIG_KEY, public: false, metadata });
      return { key: CONFIG_KEY, metadata };
    } catch (e) {
      const error = failure(e);
      return message(error.message, 400, error.code);
    }
  }));
}
