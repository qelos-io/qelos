import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractJson,
  normalizeBlueprint,
  parseBlueprintPlan,
  toIdentifier,
  toPropertyKey,
  toSingular,
} from '../blueprint-generation';
import { AIMessageTemplates } from '../ai-message-templates';

describe('extractJson', () => {
  it('reads plain JSON', () => {
    assert.deepStrictEqual(extractJson('{"a":1}'), { a: 1 });
  });

  it('reads JSON inside code fences and surrounding prose', () => {
    assert.deepStrictEqual(extractJson('Sure! Here it is:\n```json\n{"a":{"b":[1,2]}}\n```\nHope that helps'), { a: { b: [1, 2] } });
  });

  it('is not fooled by braces inside strings', () => {
    assert.deepStrictEqual(extractJson('{"jq":"{ .a } }","b":2} trailing }'), { jq: '{ .a } }', b: 2 });
  });

  it('throws on truncated or missing JSON', () => {
    assert.throws(() => extractJson('{"a": [1, 2'), /middle of the JSON/);
    assert.throws(() => extractJson('no json at all'), /no JSON/);
  });
});

describe('naming helpers', () => {
  it('builds snake_case identifiers', () => {
    assert.strictEqual(toIdentifier('Project Tasks'), 'project_tasks');
    assert.strictEqual(toIdentifier('projectTask'), 'project_task');
    assert.strictEqual(toIdentifier('  Order-Item! '), 'order_item');
  });

  it('singularizes only unambiguous endings', () => {
    assert.strictEqual(toSingular('invoices'), 'invoice');
    assert.strictEqual(toSingular('categories'), 'category');
    assert.strictEqual(toSingular('boxes'), 'box');
    assert.strictEqual(toSingular('address'), 'address');
    assert.strictEqual(toSingular('status'), 'status');
    assert.strictEqual(toSingular('task'), 'task');
  });

  it('builds camelCase property keys and keeps existing camelCase', () => {
    assert.strictEqual(toPropertyKey('Due Date'), 'dueDate');
    assert.strictEqual(toPropertyKey('due_date'), 'dueDate');
    assert.strictEqual(toPropertyKey('dueDate'), 'dueDate');
    assert.strictEqual(toPropertyKey('2fa code'), '_2faCode');
  });
});

describe('parseBlueprintPlan', () => {
  it('reads a JSON plan, singularizing and de-duplicating', () => {
    const plan = parseBlueprintPlan(
      '```json\n[{"identifier":"Customers","name":"Customers","purpose":"Who buys","relatesTo":[]},{"identifier":"invoices","name":"Invoices","purpose":"Bills","relatesTo":["Customers"]},{"identifier":"invoice","name":"Dup"}]\n```',
    );
    assert.deepStrictEqual(plan.map((p) => p.identifier), ['customer', 'invoice']);
    assert.strictEqual(plan[1].name, 'Invoice');
    assert.deepStrictEqual(plan[1].relatesTo, ['customer']);
  });

  it('falls back to a bulleted list', () => {
    const plan = parseBlueprintPlan('Here are the blueprints:\n- **Project**: a piece of work\n- Task - something to do\n\n3. Milestone: a checkpoint');
    assert.deepStrictEqual(plan.map((p) => p.identifier), ['project', 'task', 'milestone']);
    assert.strictEqual(plan[0].purpose, 'a piece of work');
  });

  it('caps the number of blueprints', () => {
    const many = JSON.stringify(Array.from({ length: 25 }, (_, i) => ({ name: `Thing ${i}` })));
    assert.strictEqual(parseBlueprintPlan(many).length, 10);
  });

  it('returns an empty plan for nonsense', () => {
    assert.deepStrictEqual(parseBlueprintPlan('I cannot help with that.'), []);
  });
});

describe('normalizeBlueprint', () => {
  const raw = {
    identifier: 'Invoices',
    name: 'Invoices',
    description: 'A bill',
    permissionScope: 'galaxy',
    permissions: [{ operation: 'nuke', scope: 'user' }],
    properties: {
      'Invoice Number': { title: 'Number', type: 'string', required: true },
      status: { type: 'enum', enum: ['draft', 'paid'], required: 'yes' },
      total: { type: 'number', min: 0, max: 'lots' },
      customer: { type: 'object', title: 'Customer' },
      ghost: { type: 'string' },
    },
    relations: [
      { key: 'customer', target: 'Customers' },
      { key: 'missing', target: 'customer' },
      { key: 'ghost', target: 'nothing' },
    ],
    updateMapping: { total: '.metadata.q * .metadata.p', bad: 5 },
    limitations: [{ scope: 'user', value: 3, properties: ['total', 'nope'] }, { scope: 'x', value: 1 }],
  };
  const result = normalizeBlueprint(raw, ['customer']);

  it('builds a singular snake_case identifier', () => {
    assert.strictEqual(result.identifier, 'invoice');
  });

  it('keeps valid properties and repairs invalid ones', () => {
    assert.deepStrictEqual(Object.keys(result.properties), ['invoiceNumber', 'status', 'total', 'customer', 'ghost']);
    assert.strictEqual(result.properties.status.type, 'string');
    assert.strictEqual(result.properties.status.required, false);
    assert.strictEqual(result.properties.total.min, 0);
    assert.strictEqual(result.properties.total.max, undefined);
  });

  it('keeps only relations to known blueprints through existing properties, as string properties', () => {
    assert.deepStrictEqual(result.relations, [{ key: 'customer', target: 'customer' }]);
    assert.strictEqual(result.properties.customer.type, 'string');
  });

  it('falls back to default permissions and scope, drops invalid mapping and limitations', () => {
    assert.strictEqual(result.permissionScope, 'user');
    assert.strictEqual(result.permissions.length, 6);
    assert.deepStrictEqual(result.updateMapping, { total: '.metadata.q * .metadata.p' });
    assert.deepStrictEqual(result.limitations.map((l) => l.properties), [['total']]);
    assert.deepStrictEqual(result.dispatchers, { create: false, update: false, delete: false });
  });

  it('allows a relation to itself and gives an empty blueprint a title property', () => {
    const tree = normalizeBlueprint({ name: 'Category', properties: { parent: { type: 'string' } }, relations: [{ key: 'parent', target: 'category' }] }, []);
    assert.deepStrictEqual(tree.relations, [{ key: 'parent', target: 'category' }]);
    assert.deepStrictEqual(Object.keys(normalizeBlueprint({ name: 'Empty' }, []).properties), ['title']);
  });

  it('prefers the planned identifier and name', () => {
    const planned = { identifier: 'task', name: 'Task', purpose: 'To do', relatesTo: [] };
    const named = normalizeBlueprint({ identifier: 'todo_item', name: 'Todo items' }, [], planned);
    assert.strictEqual(named.identifier, 'task');
    assert.strictEqual(named.name, 'Task');
    assert.strictEqual(named.description, 'To do');
  });

  it('rejects non-objects', () => {
    assert.throws(() => normalizeBlueprint([], []), /not a blueprint/);
    assert.throws(() => normalizeBlueprint(null, []), /not a blueprint/);
  });
});

describe('blueprint prompts', () => {
  it('tell the model to answer in bare JSON and what a relation is', () => {
    const plan = AIMessageTemplates.getNoCodeBlueprintsSystemMessage().content as string;
    assert.match(plan, /JSON array/);
    const detail = AIMessageTemplates.getBlueprintGenerationMessages('task', '- task', 'todo app')[0].content as string;
    assert.match(detail, /no code fences/);
    assert.match(detail, /"relations"/);
    assert.doesNotMatch(detail, /fired/);
  });
});
