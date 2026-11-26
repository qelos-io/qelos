import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import IntegrationSource from '../../models/integration-source';
import logger from '../logger';
import {
  createFunction,
  deleteFunction,
  executeFunction,
  getFunction,
  listFunctions,
  updateFunction,
} from '../../controllers/lambdas';

/** a kind without functions: a connection that is found is refused before any provider is called */
const stored = { _id: 'source-1', tenant: 'tenant-a', kind: 'openai' };
const query = (value: unknown) => ({ lean: () => ({ exec: async () => value }) });

mock.method(logger as any, 'error', () => {});
mock.method(IntegrationSource as any, 'findById', (id: string) => query(id === stored._id ? stored : null));
mock.method(IntegrationSource as any, 'findOne', (filter: Record<string, unknown>) =>
  query(Object.entries(filter).every(([key, value]) => stored[key] === value) ? stored : null),
);

async function call(handler: Function, tenant: string) {
  const answer: { status: number; body?: any } = { status: 200 };
  const res: any = {
    status: (code: number) => ((answer.status = code), res),
    json: (body: unknown) => ((answer.body = body), res),
    send: () => res,
  };
  await handler({ headers: { tenant }, params: { sourceId: stored._id, functionName: 'f' }, body: {} }, res);
  return answer;
}

describe('function connections', () => {
  const handlers = { listFunctions, getFunction, createFunction, updateFunction, deleteFunction, executeFunction };

  for (const [name, handler] of Object.entries(handlers)) {
    it(`${name} finds a connection only within the tenant of the request`, async () => {
      assert.deepEqual(await call(handler, 'tenant-a'), { status: 400, body: { message: 'Unsupported source kind' } });
      assert.deepEqual(await call(handler, 'tenant-b'), { status: 404, body: { message: 'Source not found' } });
    });
  }
});
