import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import QlPayments from '../src/payments';
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
