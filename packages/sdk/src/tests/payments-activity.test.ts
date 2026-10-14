import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { QelosSDKOptions } from '../types';
import QlPayments from '../payments';
import QlManagePayments from '../administrator/payments';

function jsonResponse(body: unknown) {
  const res = new Response(JSON.stringify(body));
  res.headers.set('Content-Type', 'application/json');
  return res;
}

const activity = [
  { kind: 'invoice.paid', at: '2026-03-01T00:00:00.000Z', amount: 49, currency: 'USD', invoiceId: 'inv-1' },
  { kind: 'subscription.created', at: '2026-01-01T00:00:00.000Z' },
];

test('getSubscriptionActivity', async (t) => {
  const make = () => {
    const calls: string[] = [];
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (url) => {
        calls.push(url.toString());
        return jsonResponse(activity);
      },
    };
    return { calls, options };
  };

  await t.test('user SDK reads the activity of a subscription', async () => {
    const { calls, options } = make();
    const result = await new QlPayments(options).getSubscriptionActivity('sub-1');
    assert.equal(calls[0], 'http://localhost:3000/api/subscriptions/sub-1/activity');
    assert.deepEqual(result, activity);
  });

  await t.test('admin SDK reads the activity of any subscription', async () => {
    const { calls, options } = make();
    const result = await new QlManagePayments(options).getSubscriptionActivity('sub-2');
    assert.equal(calls[0], 'http://localhost:3000/api/subscriptions/sub-2/activity');
    assert.deepEqual(result, activity);
  });
});
