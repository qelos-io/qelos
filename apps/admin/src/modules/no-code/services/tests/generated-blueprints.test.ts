import { describe, expect, it } from 'vitest';
import { BlueprintPropertyType } from '@qelos/global-types';
import { creationOrder, toReviewRows, withoutDanglingLinks } from '../generated-blueprints';

const prop = (extra = {}) => ({ title: 'T', type: BlueprintPropertyType.STRING, description: 'd', required: false, ...extra });
const make = (identifier: string, relations: { key: string; target: string }[] = []) => ({
  identifier,
  name: identifier.toUpperCase(),
  description: `${identifier} desc`,
  properties: { a: prop({ required: true }), b: prop({ type: BlueprintPropertyType.NUMBER }) },
  relations,
});

describe('toReviewRows', () => {
  it('summarises properties and links and marks identifiers the app already has', () => {
    const rows = toReviewRows([make('invoice', [{ key: 'a', target: 'customer' }]), make('customer')], ['customer']);
    expect(rows[0]).toMatchObject({ identifier: 'invoice', name: 'INVOICE', exists: false, links: [{ key: 'a', target: 'customer' }] });
    expect(rows[0].properties.map((p) => [p.key, p.typeLabel, p.required])).toEqual([
      ['a', 'Text', true],
      ['b', 'Number', false],
    ]);
    expect(rows[1].exists).toBe(true);
  });

  it('tolerates a sparse blueprint', () => {
    expect(toReviewRows([{ identifier: 'x' }], [])[0]).toMatchObject({ name: 'x', properties: [], links: [] });
  });
});

describe('creationOrder', () => {
  const invoice = make('invoice', [{ key: 'customer', target: 'customer' }]);
  const customer = make('customer', [{ key: 'parent', target: 'customer' }]);
  const line = make('line', [{ key: 'invoice', target: 'invoice' }]);

  it('creates linked-to blueprints first, whatever the order they came in', () => {
    expect(creationOrder([line, invoice, customer], [0, 1, 2]).map((b) => b.identifier)).toEqual(['customer', 'invoice', 'line']);
  });

  it('keeps only the selected ones and survives cycles and self links', () => {
    expect(creationOrder([line, invoice, customer], [1]).map((b) => b.identifier)).toEqual(['invoice']);
    const a = make('a', [{ key: 'x', target: 'b' }]);
    const b = make('b', [{ key: 'y', target: 'a' }]);
    expect(creationOrder([a, b], [0, 1]).map((blueprint) => blueprint.identifier).sort()).toEqual(['a', 'b']);
  });
});

describe('withoutDanglingLinks', () => {
  it('keeps links to selected or existing blueprints only', () => {
    const result = withoutDanglingLinks(
      [make('invoice', [{ key: 'c', target: 'customer' }, { key: 'o', target: 'order' }, { key: 'u', target: 'invoice' }])],
      ['customer'],
    );
    expect(result[0].relations).toEqual([{ key: 'c', target: 'customer' }, { key: 'u', target: 'invoice' }]);
  });
});
