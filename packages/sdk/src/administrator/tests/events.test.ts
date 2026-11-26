import * as assert from 'node:assert/strict';
import { QelosSDKOptions } from '../../types.js';
import QlEvents, { IQelosEventsPage } from '../events.js';

const { describe, test } = require('node:test')

describe('QlEvents', () => {
  test('getList answers one page of events', async () => {
    const page: IQelosEventsPage = {
      events: [{ _id: 'e1', tenant: '0', source: 's', kind: 'k', eventName: 'e', description: 'd', created: new Date(0) }],
      total: 1,
      page: 0,
      limit: 50,
      totalPages: 1,
    };
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async () => new Response(JSON.stringify(page), { headers: { 'content-type': 'application/json' } }),
    };
    const { events, total } = await new QlEvents(options).getList({ kind: 'k' });
    assert.deepEqual([events.map((e) => e._id), total], [['e1'], 1]);
  });
});
