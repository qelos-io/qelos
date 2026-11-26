import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMetadata } from '../src/routes/entities-query.js';
import { createSchemaLoader } from '../src/blueprints/schemas.js';

/** Contract between the mock and the data service (`apps/no-code`): which property values it accepts and stores. */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'no-code', 'server');
const named = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default ?? loaded;
};

const TYPES = ['string', 'number', 'boolean', 'object', 'file', 'date', 'datetime', 'time', 'unknown'];
const VALUES: unknown[] = [
  undefined, null, '', ' ', 'a', 'b', '5', '5.5', 'abc:1', '10:30', '10:30:59', ':', 'http://x', 'ftp://x',
  '2026-01-05', '2026-01-05T10:00:00Z', '1999-01-01', 0, 1, 5, 100, -1, true, false,
  {}, { a: 'b' }, { a: 1 }, { a: null }, { a: {} }, [], ['a'], ['a', 'b'], [1], [null],
];
/** limits that apply on top of a type */
const LIMITS: Record<string, object[]> = {
  string: [{ enum: ['a', '10:30'] }, { enum: [] }],
  number: [{ min: 1, max: 5 }, { min: 0 }],
  date: [{ min: '2026-01-01', max: '2026-12-31' }],
  datetime: [{ min: '2026-01-01' }],
  time: [{ min: '09:00', max: '11:00' }],
  object: [
    { schema: { type: 'object' } },
    { schema: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] } },
    { schema: { type: 'object', additionalProperties: false } },
    { schema: { type: 'array', items: { type: 'number' } } },
    { schema: { type: 'integer' } },
    // `ajv` refuses these schemas themselves
    { schema: { type: 'nothing' } },
    { schema: { type: 'object', made: 'up' } },
  ],
};

const json = (value: unknown) => JSON.parse(JSON.stringify(value));

describe('the mock follows which values the data service accepts', () => {
  test('each type, required or not, single or multiple, with limits', async () => {
    const { getValidBlueprintMetadata } = await named('services/entities.service');
    const schema = await createSchemaLoader((warning) => assert.fail(warning))();
    let accepted = 0;
    let refused = 0;
    for (const type of TYPES) {
      for (const limit of [{}, ...(LIMITS[type] ?? [])]) {
        for (const required of [false, true]) {
          for (const multi of [false, true]) {
            const blueprint = { identifier: 'b', properties: { k: { title: 'K', type, required, multi, ...limit } } };
            for (const value of multi ? [...VALUES, ...VALUES.map((v) => [v])] : VALUES) {
              const input = value === undefined ? {} : { k: value };
              const outcome = (run: () => unknown) => {
                try {
                  return { stored: json(run()) };
                } catch (e: any) {
                  // the service answers its own refusals with their status, and anything else it fails on with 500
                  return e.status ? { status: e.status, message: e.responseMessage ?? e.message } : { status: 500 };
                }
              };
              const expected: any = outcome(() => getValidBlueprintMetadata(structuredClone(input), blueprint));
              const answer: any = outcome(() => validateMetadata(structuredClone(input), blueprint as any, { schema }));
              if (answer.status === 500) delete answer.message;
              const label = `${type} ${JSON.stringify(limit)} required=${required} multi=${multi} ${JSON.stringify(value)}`;
              assert.deepEqual(answer, expected, label);
              if (expected.stored) accepted++;
              else refused++;
            }
          }
        }
      }
    }
    assert.ok(accepted > 500 && refused > 500, `${accepted} accepted, ${refused} refused`);
  });
});
