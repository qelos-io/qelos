import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import QlPayments from '../src/payments';
import QlPaymentsAdmin from '../src/administrator/payments';
import { QelosSDKOptions } from '../src/types';

function jsonResponse(body: unknown) {
  const res = new Response(JSON.stringify(body));
  res.headers.set('Content-Type', 'application/json');
  return res;
}

test('QlPayments', async (t) => {
  await t.test('checkout serializes the customer object into the POST body', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse({ subscriptionId: 'sub-1', checkoutUrl: 'https://sumit.example/checkout' });
      },
    };
    const payments = new QlPayments(options);
    await payments.checkout({
      planId: 'plan-1',
      billingCycle: 'monthly',
      successUrl: 'https://app.example/success',
      cancelUrl: 'https://app.example/cancel',
      customer: {
        name: 'Jane Doe',
        nameForInvoice: 'Acme Inc.',
        email: 'jane@acme.example',
        phone: '+1-555-0100',
        address: '1 Main St',
        city: 'Springfield',
      },
    });

    assert.equal(init?.method, 'post');
    const body = JSON.parse(init?.body as string);
    assert.deepEqual(body.customer, {
      name: 'Jane Doe',
      nameForInvoice: 'Acme Inc.',
      email: 'jane@acme.example',
      phone: '+1-555-0100',
      address: '1 Main St',
      city: 'Springfield',
    });
  });

  await t.test('checkout omits customer when not provided', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse({ subscriptionId: 'sub-1' });
      },
    };
    const payments = new QlPayments(options);
    await payments.checkout({ planId: 'plan-1', billingCycle: 'monthly' });

    const body = JSON.parse(init?.body as string);
    assert.equal('customer' in body, false);
  });
});

test('QlPaymentsAdmin', async (t) => {
  await t.test('createCoupon passes benefitDurationUnit/benefitDurationValue through to the POST body', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse({ _id: 'coupon-1', code: 'FREEMONTH' });
      },
    };
    const paymentsAdmin = new QlPaymentsAdmin(options);
    await paymentsAdmin.createCoupon({
      code: 'FREEMONTH',
      discountType: 'percentage',
      discountValue: 100,
      currentRedemptions: 0,
      applicablePlanIds: [],
      isActive: true,
      benefitDurationUnit: 'months',
      benefitDurationValue: 1,
    });

    assert.equal(init?.method, 'post');
    const body = JSON.parse(init?.body as string);
    assert.equal(body.benefitDurationUnit, 'months');
    assert.equal(body.benefitDurationValue, 1);
  });

  await t.test('updateCoupon passes benefitDurationUnit/benefitDurationValue through to the PUT body', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse({ _id: 'coupon-1', code: 'FREEMONTH' });
      },
    };
    const paymentsAdmin = new QlPaymentsAdmin(options);
    await paymentsAdmin.updateCoupon('coupon-1', {
      benefitDurationUnit: 'days',
      benefitDurationValue: 14,
    });

    assert.equal(init?.method, 'put');
    const body = JSON.parse(init?.body as string);
    assert.equal(body.benefitDurationUnit, 'days');
    assert.equal(body.benefitDurationValue, 14);
  });

  await t.test('getWorkspaceSubscriptions calls the workspace-filtered endpoint with the query string', async () => {
    let url: string | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (requestUrl) => {
        url = requestUrl.toString();
        return jsonResponse([
          { _id: 'sub-1', billableEntityType: 'workspace', billableEntityId: 'ws-1', planId: { _id: 'plan-1', name: 'Pro' } },
        ]);
      },
    };
    const paymentsAdmin = new QlPaymentsAdmin(options);
    const subscriptions = await paymentsAdmin.getWorkspaceSubscriptions({ status: 'active' });

    assert.equal(url, 'http://localhost:3000/api/subscriptions/workspaces?status=active');
    assert.equal(subscriptions[0].billableEntityId, 'ws-1');
    assert.equal((subscriptions[0].planId as any).name, 'Pro');
  });

  await t.test('getWorkspaceSubscriptions omits the query string when no query is provided', async () => {
    let url: string | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (requestUrl) => {
        url = requestUrl.toString();
        return jsonResponse([]);
      },
    };
    const paymentsAdmin = new QlPaymentsAdmin(options);
    await paymentsAdmin.getWorkspaceSubscriptions();

    assert.equal(url, 'http://localhost:3000/api/subscriptions/workspaces');
  });
});
