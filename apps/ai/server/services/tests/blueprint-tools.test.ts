import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IBlueprint } from '@qelos/global-types';
import { generateBlueprintTools } from '../blueprint-tools-service';

// Anthropic requires input_schema property keys to match this pattern
const ANTHROPIC_PROPERTY_KEY_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;

const blueprint = {
  identifier: 'task',
  name: 'Task',
  description: 'A task entity',
  properties: {
    title: { type: 'string', title: 'Title', required: true },
    rank: { type: 'number', title: 'Rank', min: 0, max: 10 },
    done: { type: 'boolean', title: 'Done' },
  },
} as unknown as IBlueprint;

describe('generateBlueprintTools', () => {
  it('generates the 5 CRUD tools', () => {
    const tools = generateBlueprintTools(blueprint);
    assert.deepStrictEqual(
      tools.map((t) => t.function.name),
      ['create_task', 'get_task', 'update_task', 'delete_task', 'list_task'],
    );
  });

  it('only uses Anthropic-compatible property keys in all tool schemas', () => {
    const tools = generateBlueprintTools(blueprint);
    for (const tool of tools) {
      for (const key of Object.keys(tool.function.parameters.properties)) {
        assert.match(
          key,
          ANTHROPIC_PROPERTY_KEY_PATTERN,
          `Property key "${key}" in tool "${tool.function.name}" violates Anthropic's pattern`,
        );
      }
    }
  });

  it('exposes list control params with "_" prefix instead of "$"', () => {
    const tools = generateBlueprintTools(blueprint);
    const listTool = tools.find((t) => t.function.name === 'list_task')!;
    const keys = Object.keys(listTool.function.parameters.properties);
    for (const param of ['_sort', '_page', '_limit', '_populate', '_fields']) {
      assert.ok(keys.includes(param), `list tool should expose ${param}`);
    }
    assert.ok(keys.every((key) => !key.startsWith('$')), 'list tool must not expose "$"-prefixed keys');
  });

  it('uses "metadata." prefix in ascending sort enum values', () => {
    const tools = generateBlueprintTools(blueprint);
    const listTool = tools.find((t) => t.function.name === 'list_task')!;
    const sortEnum: string[] = listTool.function.parameters.properties._sort.enum;
    assert.ok(sortEnum.includes('metadata.title'));
    assert.ok(sortEnum.includes('-metadata.title'));
  });
});
