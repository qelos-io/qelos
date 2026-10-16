import { describe, expect, it } from 'vitest';
import { filterBlueprints } from '../blueprints-list';

const blueprints = [
  { identifier: 'invoice', name: 'Invoice', description: 'A bill', properties: { total: { title: 'Total due', description: 'Amount' } } },
  { identifier: 'customer', name: 'Customer', properties: { email: { title: 'E-mail' } } },
  { identifier: 'note', name: undefined },
] as any[];

describe('filterBlueprints', () => {
  it('returns everything without a query', () => {
    expect(filterBlueprints(blueprints, '')).toHaveLength(3);
    expect(filterBlueprints(blueprints, undefined)).toHaveLength(3);
    expect(filterBlueprints(undefined, 'x')).toEqual([]);
  });

  it('matches name, identifier, description and property fields, ignoring case', () => {
    expect(filterBlueprints(blueprints, 'INV').map((b) => b.identifier)).toEqual(['invoice']);
    expect(filterBlueprints(blueprints, 'bill').map((b) => b.identifier)).toEqual(['invoice']);
    expect(filterBlueprints(blueprints, 'e-mail').map((b) => b.identifier)).toEqual(['customer']);
    expect(filterBlueprints(blueprints, 'amount').map((b) => b.identifier)).toEqual(['invoice']);
    expect(filterBlueprints(blueprints, 'note').map((b) => b.identifier)).toEqual(['note']);
  });

  it('returns nothing for no match', () => {
    expect(filterBlueprints(blueprints, 'zzz')).toEqual([]);
  });
});
