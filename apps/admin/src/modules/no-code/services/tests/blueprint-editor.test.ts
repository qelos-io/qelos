import { describe, expect, it } from 'vitest';
import { BlueprintPropertyType, CRUDOperation, PermissionScope } from '@qelos/global-types';
import {
  collectVocabulary,
  describeProperty,
  getPropertyLink,
  groupPermissions,
  keyFromTitle,
  propertyRows,
  removeProperty,
  ruleMatchesNobody,
  renameProperty,
  setPropertyLink,
  summarizeBlueprint,
  uniquePropertyKey,
  validateBlueprint,
} from '../blueprint-editor';

const text = (extra = {}) => ({ title: 'T', type: BlueprintPropertyType.STRING, description: '', required: false, ...extra });

const blueprint = () => ({
  identifier: 'invoice',
  name: 'Invoice',
  properties: { number: text(), total: text({ type: BlueprintPropertyType.NUMBER }), customer: text() },
  relations: [{ key: 'customer', target: 'customer' }],
  updateMapping: { total: '.metadata.qty * .metadata.price + .metadata.quantity' },
  limitations: [{ scope: PermissionScope.USER, workspaceLabels: [], roles: [], properties: ['number', 'customer'], value: 2 }],
  permissions: [
    { operation: CRUDOperation.READ, scope: PermissionScope.USER, roleBased: ['reader'], workspaceRoleBased: ['owner'], workspaceLabelsBased: ['vip'] },
    { operation: CRUDOperation.CREATE, scope: PermissionScope.USER, roleBased: ['admin'] },
    { operation: CRUDOperation.READ, scope: PermissionScope.TENANT },
  ],
  dispatchers: { create: true, update: false, delete: true },
});

describe('property keys', () => {
  it('derives a key from a title', () => {
    expect(keyFromTitle('Due date!')).toBe('due_date');
  });

  it('finds a free key', () => {
    expect(uniquePropertyKey({ title: text() }, 'title')).toBe('title_2');
    expect(uniquePropertyKey({ title: text(), title_2: text() }, 'title')).toBe('title_3');
    expect(uniquePropertyKey({}, '')).toBe('property');
  });

  it('lists rows with their keys in order', () => {
    expect(propertyRows(blueprint().properties).map((row) => row.key)).toEqual(['number', 'total', 'customer']);
  });
});

describe('renameProperty', () => {
  it('moves the property and everything pointing at it, keeping order', () => {
    const next = renameProperty(blueprint(), 'customer', 'client');
    expect(Object.keys(next.properties!)).toEqual(['number', 'total', 'client']);
    expect(next.relations).toEqual([{ key: 'client', target: 'customer' }]);
    expect(next.limitations![0].properties).toEqual(['number', 'client']);
  });

  it('updates the calculated field key and whole-word references only', () => {
    const renamed = renameProperty({ ...blueprint(), properties: { ...blueprint().properties, qty: text() } }, 'qty', 'amount');
    expect(renamed.updateMapping!.total).toBe('.metadata.amount * .metadata.price + .metadata.quantity');
    const key = renameProperty(blueprint(), 'total', 'sum');
    expect(Object.keys(key.updateMapping!)).toEqual(['sum']);
  });

  it('refuses to clash with another property or an empty key', () => {
    const original = blueprint();
    expect(renameProperty(original, 'number', 'total')).toBe(original);
    expect(renameProperty(original, 'number', '')).toBe(original);
  });
});

describe('removeProperty', () => {
  it('drops the link, the calculated field and the limit reference', () => {
    const next = removeProperty(blueprint(), 'customer');
    expect(Object.keys(next.properties!)).toEqual(['number', 'total']);
    expect(next.relations).toEqual([]);
    expect(next.limitations![0].properties).toEqual(['number']);
    expect(Object.keys(removeProperty(blueprint(), 'total').updateMapping!)).toEqual([]);
  });
});

describe('links', () => {
  it('reads, sets and clears a link, forcing text on the property', () => {
    const original = { ...blueprint(), relations: [] };
    expect(getPropertyLink(original, 'number')).toBeUndefined();
    const linked = setPropertyLink({ ...original, properties: { ...original.properties, total: text({ type: BlueprintPropertyType.NUMBER }) } }, 'total', 'order');
    expect(getPropertyLink(linked, 'total')).toBe('order');
    expect(linked.properties!.total.type).toBe(BlueprintPropertyType.STRING);
    expect(setPropertyLink(linked, 'total', 'customer').relations).toEqual([{ key: 'total', target: 'customer' }]);
    expect(setPropertyLink(linked, 'total', null).relations).toEqual([]);
  });
});

describe('describeProperty', () => {
  it('summarises type, list, options and ranges', () => {
    expect(describeProperty(text({ multi: true, enum: ['a', 'b', 'c', 'd'] }))).toEqual({ typeLabel: 'Text', facts: ['List', 'a / b / c +1'] });
    expect(describeProperty(text({ type: BlueprintPropertyType.NUMBER, min: 1, max: 5 })).facts).toEqual(['1 - 5']);
    expect(describeProperty(text({ type: BlueprintPropertyType.NUMBER, max: 5 })).facts).toEqual(['≤ 5']);
    expect(describeProperty(text({ type: BlueprintPropertyType.DATETIME })).typeLabel).toBe('Date & time');
  });
});

describe('summaries', () => {
  it('counts every part of a blueprint', () => {
    expect(summarizeBlueprint(blueprint())).toEqual({ properties: 3, links: 1, rules: 3, calculated: 1, events: 2, limits: 1 });
    expect(summarizeBlueprint({})).toEqual({ properties: 0, links: 0, rules: 0, calculated: 0, events: 0, limits: 0 });
  });

  it('groups permission rules by action, keeping their index', () => {
    const groups = groupPermissions(blueprint().permissions);
    expect(groups.map((group) => group.operation)).toEqual(['create', 'read', 'update', 'delete']);
    expect(groups[1].rules.map((rule) => rule.index)).toEqual([0, 2]);
    expect(groups[2].rules).toEqual([]);
  });

  it('collects roles and labels other blueprints use, with the defaults', () => {
    const vocabulary = collectVocabulary([blueprint(), { limitations: [{ scope: PermissionScope.USER, roles: ['editor'], workspaceLabels: ['pro'], properties: [], value: 1 }] }]);
    expect(vocabulary.roles).toEqual(['admin', 'editor', 'reader', 'user']);
    expect(vocabulary.workspaceRoles).toEqual(['admin', 'member', 'owner']);
    expect(vocabulary.workspaceLabels).toEqual(['*', 'pro', 'vip']);
    expect(collectVocabulary(undefined).roles).toEqual(['admin', 'user']);
  });
});

describe('ruleMatchesNobody', () => {
  it('needs a role or a workspace role unless it is for guests', () => {
    expect(ruleMatchesNobody({ guest: true })).toBe(false);
    expect(ruleMatchesNobody({ roleBased: ['*'] })).toBe(false);
    expect(ruleMatchesNobody({ workspaceRoleBased: ['admin'] })).toBe(false);
    expect(ruleMatchesNobody({ roleBased: [], workspaceRoleBased: [], workspaceLabelsBased: ['*'] })).toBe(true);
    expect(ruleMatchesNobody({})).toBe(true);
  });
});

describe('validateBlueprint', () => {
  it('accepts a complete blueprint', () => {
    expect(validateBlueprint(blueprint(), false)).toEqual([]);
  });

  it('requires a name, and a clean identifier for a new blueprint', () => {
    expect(validateBlueprint({ ...blueprint(), name: ' ' }, false).map((issue) => issue.section)).toEqual(['settings']);
    expect(validateBlueprint({ ...blueprint(), identifier: 'Bad Id' }, true)).toHaveLength(1);
    expect(validateBlueprint({ ...blueprint(), identifier: 'Bad Id' }, false)).toEqual([]);
  });

  it('flags half-filled parts in their section', () => {
    const broken = {
      ...blueprint(),
      properties: { a: text({ title: '' }) },
      relations: [{ key: 'a', target: '' }],
      updateMapping: { a: ' ' },
      permissions: [{ operation: '' as any }],
    };
    expect(validateBlueprint(broken, false).map((issue) => issue.section).sort()).toEqual(['access', 'automation', 'properties', 'properties']);
  });
});
