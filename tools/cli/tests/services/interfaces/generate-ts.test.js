const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const generatorUrl = pathToFileURL(
  path.join(__dirname, '..', '..', '..', 'services', 'interfaces', 'generate-ts.mjs')
).href;

describe('generate-ts (blueprint → .d.ts generator)', async () => {
  let generateTsDeclarations;
  let toPascalCase;

  before(async () => {
    const mod = await import(generatorUrl);
    generateTsDeclarations = mod.generateTsDeclarations;
    toPascalCase = mod.toPascalCase;
  });

  it('emits the auto-generated banner and SDK import', () => {
    const output = generateTsDeclarations([]);
    assert.ok(output.startsWith('// AUTO-GENERATED — DO NOT EDIT'));
    assert.ok(output.includes("import type { IBaseBlueprintEntity } from '@qelos/sdk/blueprints-entities';"));
  });

  it('emits Properties and Entity interfaces for primitive properties', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'todo',
        name: 'Todo',
        properties: {
          title: { type: 'string', required: true, title: 'Title', description: '' },
          completed: { type: 'boolean', required: false, title: 'Completed', description: '' },
          dueDate: { type: 'datetime', required: false, title: 'Due Date', description: '' },
          priority: { type: 'number', required: true, title: 'Priority', description: '' },
        },
        relations: [],
      },
    ]);

    assert.ok(output.includes('export interface TodoProperties {'));
    assert.ok(output.includes('  title: string;'));
    assert.ok(output.includes('  completed?: boolean;'));
    assert.ok(output.includes('  dueDate?: string;'));
    assert.ok(output.includes('  priority: number;'));
    assert.ok(output.includes('export interface TodoEntity extends IBaseBlueprintEntity, TodoProperties {}'));
  });

  it('marks optional properties with ?: when required is false or missing', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'note',
        properties: {
          body: { type: 'string', required: false },
          tag: { type: 'string' },
        },
      },
    ]);

    assert.ok(output.includes('  body?: string;'));
    assert.ok(output.includes('  tag?: string;'));
  });

  it('renders multi: true as an array type', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'post',
        properties: {
          tags: { type: 'string', required: true, multi: true },
          ratings: { type: 'number', required: false, multi: true },
        },
      },
    ]);

    assert.ok(output.includes('  tags: string[];'));
    assert.ok(output.includes('  ratings?: number[];'));
  });

  it('renders enum as a string-literal union', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'task',
        properties: {
          status: {
            type: 'string',
            required: true,
            enum: ['todo', 'in_progress', 'done'],
          },
        },
      },
    ]);

    assert.ok(output.includes('  status: "todo" | "in_progress" | "done";'));
  });

  it('wraps enum union with Array<...> when multi is true', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'task',
        properties: {
          labels: {
            type: 'string',
            required: false,
            multi: true,
            enum: ['urgent', 'low'],
          },
        },
      },
    ]);

    assert.ok(output.includes('  labels?: Array<"urgent" | "low">;'));
  });

  it('falls back to base type when enum has non-string values', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'thing',
        properties: {
          score: {
            type: 'number',
            required: true,
            enum: [1, 2, 3],
          },
        },
      },
    ]);

    assert.ok(output.includes('  score: number;'));
    assert.ok(!output.includes('1 | 2 | 3'));
  });

  it('renders object type as Record<string, any> by default', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'doc',
        properties: {
          payload: { type: 'object', required: false },
        },
      },
    ]);

    assert.ok(output.includes('  payload?: Record<string, any>;'));
  });

  it('renders object with schema using nested property types', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'doc',
        properties: {
          meta: {
            type: 'object',
            required: true,
            schema: {
              type: 'object',
              properties: {
                views: { type: 'number' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    ]);

    assert.ok(output.includes('views?: number;'));
    assert.ok(output.includes('slug?: string;'));
  });

  it('emits an empty Properties body for blueprints with zero properties', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'empty',
        properties: {},
      },
    ]);

    assert.ok(output.includes('export interface EmptyProperties {\n}'));
    assert.ok(output.includes('export interface EmptyEntity extends IBaseBlueprintEntity, EmptyProperties {}'));
  });

  it('aggregates blueprints into a BlueprintEntitiesRegistry interface keyed by identifier', () => {
    const output = generateTsDeclarations([
      { identifier: 'todo', properties: {} },
      { identifier: 'project', properties: {} },
    ]);

    assert.ok(output.includes('export interface BlueprintEntitiesRegistry {'));
    assert.ok(output.includes('  "todo": TodoEntity;'));
    assert.ok(output.includes('  "project": ProjectEntity;'));
  });

  it("emits a declare module '@qelos/sdk' augmentation block", () => {
    const output = generateTsDeclarations([
      { identifier: 'todo', properties: {} },
    ]);

    assert.ok(output.includes("declare module '@qelos/sdk' {"));
    assert.ok(output.includes('  interface BlueprintEntitiesRegistry {'));
    assert.ok(output.includes('    "todo": TodoEntity;'));
  });

  it('emits relations as Pick<TargetEntity, "identifier"> | string when target is in the same set', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'todo',
        properties: {},
        relations: [{ key: 'project', target: 'project' }],
      },
      {
        identifier: 'project',
        properties: {},
      },
    ]);

    assert.ok(output.includes("  project?: Pick<ProjectEntity, 'identifier'> | string;"));
  });

  it('falls back to string for relations whose target is not being generated', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'todo',
        properties: {},
        relations: [{ key: 'owner', target: 'user' }],
      },
    ]);

    assert.ok(output.includes('  owner?: string;'));
  });

  it('sanitizes non-PascalCase identifiers and quotes registry keys', () => {
    const output = generateTsDeclarations([
      { identifier: 'todo-list', properties: {} },
      { identifier: 'my_thing', properties: {} },
    ]);

    assert.ok(output.includes('export interface TodoListProperties {'));
    assert.ok(output.includes('export interface MyThingEntity extends IBaseBlueprintEntity, MyThingProperties {}'));
    assert.ok(output.includes('  "todo-list": TodoListEntity;'));
    assert.ok(output.includes('  "my_thing": MyThingEntity;'));
  });

  it('avoids name collisions when identifiers map to the same PascalCase', () => {
    const output = generateTsDeclarations([
      { identifier: 'todo-list', properties: {} },
      { identifier: 'todo_list', properties: {} },
    ]);

    assert.ok(output.includes('TodoListEntity'));
    assert.ok(output.includes('TodoList2Entity'));
    assert.ok(output.includes('  "todo-list": TodoListEntity;'));
    assert.ok(output.includes('  "todo_list": TodoList2Entity;'));
  });

  it('quotes property keys that are not valid JS identifiers', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'thing',
        properties: {
          'first-name': { type: 'string', required: true },
          '2nd_field': { type: 'number', required: false },
        },
      },
    ]);

    assert.ok(output.includes('  "first-name": string;'));
    assert.ok(output.includes('  "2nd_field"?: number;'));
  });

  it('treats file type as string', () => {
    const output = generateTsDeclarations([
      {
        identifier: 'asset',
        properties: {
          file: { type: 'file', required: true },
        },
      },
    ]);

    assert.ok(output.includes('  file: string;'));
  });

  it('is idempotent across repeated runs (same input → same output)', () => {
    const blueprints = [
      {
        identifier: 'todo',
        properties: {
          title: { type: 'string', required: true },
          completed: { type: 'boolean', required: false },
        },
        relations: [],
      },
    ];

    const a = generateTsDeclarations(blueprints);
    const b = generateTsDeclarations(blueprints);
    assert.strictEqual(a, b);
  });

  it('returns a stable snapshot for the canonical fixture', () => {
    const blueprints = [
      {
        identifier: 'todo',
        properties: {
          title: { type: 'string', required: true },
          completed: { type: 'boolean', required: false },
          status: { type: 'string', required: true, enum: ['todo', 'done'] },
          tags: { type: 'string', required: false, multi: true },
        },
        relations: [{ key: 'project', target: 'project' }],
      },
      {
        identifier: 'project',
        properties: {
          name: { type: 'string', required: true },
        },
      },
    ];

    const expected = [
      '// AUTO-GENERATED — DO NOT EDIT',
      '// Generated by `qelos interfaces build`',
      '// Source: *.blueprint.json files',
      '',
      "import type { IBaseBlueprintEntity } from '@qelos/sdk/blueprints-entities';",
      '',
      'export interface TodoProperties {',
      '  title: string;',
      '  completed?: boolean;',
      '  status: "todo" | "done";',
      '  tags?: string[];',
      "  project?: Pick<ProjectEntity, 'identifier'> | string;",
      '}',
      '',
      'export interface TodoEntity extends IBaseBlueprintEntity, TodoProperties {}',
      '',
      'export interface ProjectProperties {',
      '  name: string;',
      '}',
      '',
      'export interface ProjectEntity extends IBaseBlueprintEntity, ProjectProperties {}',
      '',
      'export interface BlueprintEntitiesRegistry {',
      '  "todo": TodoEntity;',
      '  "project": ProjectEntity;',
      '}',
      '',
      "declare module '@qelos/sdk' {",
      '  interface BlueprintEntitiesRegistry {',
      '    "todo": TodoEntity;',
      '    "project": ProjectEntity;',
      '  }',
      '}',
      '',
    ].join('\n');

    assert.strictEqual(generateTsDeclarations(blueprints), expected);
  });

  describe('toPascalCase', () => {
    it('converts dashed and underscored identifiers', () => {
      assert.strictEqual(toPascalCase('todo-list'), 'TodoList');
      assert.strictEqual(toPascalCase('my_thing'), 'MyThing');
      assert.strictEqual(toPascalCase('todo'), 'Todo');
    });

    it('prefixes a leading underscore when the identifier starts with a digit', () => {
      assert.strictEqual(toPascalCase('123abc'), '_123abc');
    });

    it('returns "_" when the identifier has no alphanumeric characters', () => {
      assert.strictEqual(toPascalCase('---'), '_');
      assert.strictEqual(toPascalCase(''), '_');
    });
  });
});
