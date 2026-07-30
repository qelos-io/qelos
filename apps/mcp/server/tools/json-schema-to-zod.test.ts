import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type * as z from 'zod/v4';
import { jsonSchemaToZodShape } from './json-schema-to-zod';

// `ZodRawShape` values are typed against the generic zod-core interface, which
// hides classic-zod instance methods (parse/optional/describe). Cast back to
// the concrete classic type for assertions — the runtime objects are always
// real `zod/v4` classic schema instances.
function asZod(value: unknown): z.ZodTypeAny {
  return value as z.ZodTypeAny;
}

describe('jsonSchemaToZodShape', () => {
  it('returns an empty shape for missing/invalid parameters', () => {
    assert.deepEqual(jsonSchemaToZodShape(undefined), {});
    assert.deepEqual(jsonSchemaToZodShape(null), {});
    assert.deepEqual(jsonSchemaToZodShape({ type: 'object' }), {});
  });

  it('marks properties in `required` as required, others as optional', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        city: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['city'],
    });

    assert.equal(asZod(shape.city).isOptional(), false);
    assert.equal(asZod(shape.limit).isOptional(), true);
  });

  it('parses string/number/integer/boolean/array/object types', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        str: { type: 'string' },
        num: { type: 'number' },
        int: { type: 'integer' },
        bool: { type: 'boolean' },
        arr: { type: 'array', items: { type: 'string' } },
        obj: { type: 'object', properties: { nested: { type: 'string' } }, required: ['nested'] },
      },
      required: ['str', 'num', 'int', 'bool', 'arr', 'obj'],
    });

    assert.equal(asZod(shape.str).parse('hello'), 'hello');
    assert.equal(asZod(shape.num).parse(1.5), 1.5);
    assert.equal(asZod(shape.int).parse(2), 2);
    assert.equal(asZod(shape.bool).parse(true), true);
    assert.deepEqual(asZod(shape.arr).parse(['a', 'b']), ['a', 'b']);
    assert.deepEqual(asZod(shape.obj).parse({ nested: 'x' }), { nested: 'x' });
  });

  it('supports string enums', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } },
      required: ['color'],
    });

    assert.equal(asZod(shape.color).parse('red'), 'red');
    assert.throws(() => asZod(shape.color).parse('yellow'));
  });

  it('falls back to unknown for unrecognized/missing types', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: { anything: {} },
    });

    assert.equal(asZod(shape.anything).parse('literally anything'), 'literally anything');
    assert.equal(asZod(shape.anything).parse(42), 42);
  });

  it('applies descriptions when present', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    });

    assert.equal(asZod(shape.city).description, 'City name');
  });
});
