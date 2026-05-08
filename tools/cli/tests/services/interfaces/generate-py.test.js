const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const generatorUrl = pathToFileURL(
  path.join(__dirname, '..', '..', '..', 'services', 'interfaces', 'generate-py.mjs')
).href;

describe('generate-py (blueprint → .py generator)', async () => {
  let generatePyDeclarations;
  let toPascalCase;

  before(async () => {
    const mod = await import(generatorUrl);
    generatePyDeclarations = mod.generatePyDeclarations;
    toPascalCase = mod.toPascalCase;
  });

  it('emits the auto-generated banner and required imports', () => {
    const output = generatePyDeclarations([]);
    assert.ok(output.startsWith('# AUTO-GENERATED — DO NOT EDIT'));
    assert.ok(output.includes('import datetime'));
    assert.ok(output.includes('from typing import Any, Dict, List, Literal, TypedDict, Union'));
    assert.ok(output.includes('from typing_extensions import NotRequired'));
  });

  it('emits Properties and Entity TypedDict classes for primitive properties', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'todo',
        name: 'Todo',
        properties: {
          title: { type: 'string', required: true },
          completed: { type: 'boolean', required: false },
          dueDate: { type: 'datetime', required: false },
          priority: { type: 'number', required: true },
        },
        relations: [],
      },
    ]);

    assert.ok(output.includes('class TodoProperties(TypedDict):'));
    assert.ok(output.includes('    title: str'));
    assert.ok(output.includes('    completed: NotRequired[bool]'));
    assert.ok(output.includes('    dueDate: NotRequired[datetime.datetime]'));
    assert.ok(output.includes('    priority: float'));
    assert.ok(output.includes('class TodoEntity(TodoProperties):'));
    assert.ok(output.includes('    _id: str'));
    assert.ok(output.includes('    identifier: str'));
  });

  it('wraps optional fields with NotRequired[...] when required is false or missing', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'note',
        properties: {
          body: { type: 'string', required: false },
          tag: { type: 'string' },
        },
      },
    ]);

    assert.ok(output.includes('    body: NotRequired[str]'));
    assert.ok(output.includes('    tag: NotRequired[str]'));
  });

  it('renders multi: true as a List[...] type', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'post',
        properties: {
          tags: { type: 'string', required: true, multi: true },
          ratings: { type: 'number', required: false, multi: true },
        },
      },
    ]);

    assert.ok(output.includes('    tags: List[str]'));
    assert.ok(output.includes('    ratings: NotRequired[List[float]]'));
  });

  it('renders enum as a Literal[...] type', () => {
    const output = generatePyDeclarations([
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

    assert.ok(output.includes('    status: Literal["todo", "in_progress", "done"]'));
  });

  it('wraps a Literal enum union with List[...] when multi is true', () => {
    const output = generatePyDeclarations([
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

    assert.ok(output.includes('    labels: NotRequired[List[Literal["urgent", "low"]]]'));
  });

  it('falls back to base type when enum has non-string values', () => {
    const output = generatePyDeclarations([
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

    assert.ok(output.includes('    score: float'));
    assert.ok(!output.includes('Literal[1'));
  });

  it('maps date / datetime / time blueprint types to the python datetime module', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'event',
        properties: {
          day: { type: 'date', required: true },
          startsAt: { type: 'datetime', required: true },
          startTime: { type: 'time', required: false },
        },
      },
    ]);

    assert.ok(output.includes('    day: datetime.date'));
    assert.ok(output.includes('    startsAt: datetime.datetime'));
    assert.ok(output.includes('    startTime: NotRequired[datetime.time]'));
  });

  it('maps object type to Dict[str, Any]', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'doc',
        properties: {
          payload: { type: 'object', required: false },
        },
      },
    ]);

    assert.ok(output.includes('    payload: NotRequired[Dict[str, Any]]'));
  });

  it('treats file type as str', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'asset',
        properties: {
          file: { type: 'file', required: true },
        },
      },
    ]);

    assert.ok(output.includes('    file: str'));
  });

  it('emits an empty Properties body for blueprints with zero properties', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'empty',
        properties: {},
      },
    ]);

    assert.ok(output.includes('class EmptyProperties(TypedDict):\n    pass'));
    assert.ok(output.includes('class EmptyEntity(EmptyProperties):'));
  });

  it('emits relations as Union["TargetEntity", str] when target is in the same set', () => {
    const output = generatePyDeclarations([
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

    assert.ok(output.includes('    project: NotRequired[Union["ProjectEntity", str]]'));
  });

  it('falls back to str for relations whose target is not being generated', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'todo',
        properties: {},
        relations: [{ key: 'owner', target: 'user' }],
      },
    ]);

    assert.ok(output.includes('    owner: NotRequired[str]'));
  });

  it('sanitizes non-PascalCase identifiers and handles collisions', () => {
    const output = generatePyDeclarations([
      { identifier: 'todo-list', properties: {} },
      { identifier: 'todo_list', properties: {} },
    ]);

    assert.ok(output.includes('class TodoListProperties(TypedDict):'));
    assert.ok(output.includes('class TodoList2Properties(TypedDict):'));
    assert.ok(output.includes('class TodoListEntity(TodoListProperties):'));
    assert.ok(output.includes('class TodoList2Entity(TodoList2Properties):'));
  });

  it('skips property keys that are not valid python identifiers or are reserved', () => {
    const output = generatePyDeclarations([
      {
        identifier: 'thing',
        properties: {
          'first-name': { type: 'string', required: true },
          '2nd_field': { type: 'number', required: false },
          class: { type: 'string', required: true },
          ok_field: { type: 'string', required: true },
        },
      },
    ]);

    assert.ok(output.includes('    ok_field: str'));
    assert.ok(!output.includes('first-name'));
    assert.ok(!output.includes('2nd_field'));
    // 'class' is a python reserved keyword and must be skipped
    assert.ok(!/^\s{4}class:\s/m.test(output));
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

    const a = generatePyDeclarations(blueprints);
    const b = generatePyDeclarations(blueprints);
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
      '# AUTO-GENERATED — DO NOT EDIT',
      '# Generated by `qelos interfaces build --lang py`',
      '# Source: *.blueprint.json files',
      '',
      'import datetime',
      'from typing import Any, Dict, List, Literal, TypedDict, Union',
      'from typing_extensions import NotRequired',
      '',
      'class TodoProperties(TypedDict):',
      '    title: str',
      '    completed: NotRequired[bool]',
      '    status: Literal["todo", "done"]',
      '    tags: NotRequired[List[str]]',
      '    project: NotRequired[Union["ProjectEntity", str]]',
      '',
      'class TodoEntity(TodoProperties):',
      '    _id: str',
      '    identifier: str',
      '',
      'class ProjectProperties(TypedDict):',
      '    name: str',
      '',
      'class ProjectEntity(ProjectProperties):',
      '    _id: str',
      '    identifier: str',
      '',
      '# Registry of blueprint identifiers → Entity TypedDict:',
      '#   "todo" -> TodoEntity',
      '#   "project" -> ProjectEntity',
      '',
    ].join('\n');

    assert.strictEqual(generatePyDeclarations(blueprints), expected);
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
