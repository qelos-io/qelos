// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { buildComponent, initialPropValues, insertBlock, mergeRequirements } from '../build-component';

const table: any = {
  component: {},
  requiredProps: [
    { prop: 'data', source: 'requirements' },
    { prop: 'title', source: 'manual', type: 'text' },
    { prop: 'columns', source: 'manual', type: 'array', value: [{ a: 1 }] },
    { prop: 'size', source: 'manual', bind: true },
  ],
};

describe('initialPropValues', () => {
  it('starts requirements empty, arrays with a row and others with their value', () => {
    expect(initialPropValues(table)).toEqual({ data: '', title: '', columns: [{ a: 1 }], size: '' });
    expect(initialPropValues({ requiredProps: [{ prop: 'n', source: 'manual', value: 0 }] } as any)).toEqual({ n: 0 });
  });
});

describe('buildComponent', () => {
  it('binds data, inline objects and plain attributes', () => {
    const built = buildComponent('quick-table', table, { data: 'todos', title: 'T', columns: [{ a: 1 }], size: 'small' }, 'blueprints', '12345');
    expect(built.component).toBe('quick-table');
    expect(built.props).toEqual({ 'v-bind:data': 'todos?.result', title: 'T', 'v-bind:columns': 'columns_12345', 'v-bind:size': 'small' });
    expect(built.requirements).toEqual({
      columns_12345: { key: 'columns_12345', fromData: [{ a: 1 }] },
      todos: { key: 'todos', fromBlueprint: { name: 'todos' } },
    });
  });

  it('uses crud sources, skips empty values, honours tag, classes and inner html', () => {
    const d: any = { ...table, tag: 'div', classes: 'flex-row', getInnerHTML: () => '<p>x</p>', requiredProps: [{ prop: 'data', source: 'requirements' }, { prop: 'title', source: 'manual' }] };
    const built = buildComponent('div.flex-row', d, { data: 'orders', title: '' }, 'cruds');
    expect(built).toMatchObject({ component: 'div', classes: 'flex-row', innerHTML: '<p>x</p>' });
    expect(built.props).toEqual({ 'v-bind:data': 'orders?.result' });
    expect(built.requirements.orders).toEqual({ key: 'orders', fromCrud: { name: 'orders' } });
  });

  it('adds no requirement when no data was chosen', () => {
    expect(buildComponent('x', table, { data: '' }, 'blueprints').requirements).toEqual({});
  });
});

describe('mergeRequirements', () => {
  it('keeps one entry per key and merges inline data', () => {
    const merged = mergeRequirements([{ key: 'a', fromData: { x: 1 } } as any, { key: 'b' } as any], [{ key: 'a', fromData: { y: 2 } } as any, { key: 'c' } as any]);
    expect(merged.map((r) => r.key)).toEqual(['a', 'b', 'c']);
    expect(merged[0].fromData).toEqual({ x: 1, y: 2 });
    expect(mergeRequirements(undefined, [])).toEqual([]);
  });
});

describe('insertBlock', () => {
  const built: any = { component: 'el-button', props: { type: 'primary' }, requirements: {}, innerHTML: 'Go', classes: 'flex-1' };
  const html = '<h1>A</h1><p>B</p>';

  it('adds at the end, before and after a block and reports the new id', () => {
    expect(insertBlock(html, built).html).toBe('<h1>A</h1><p>B</p><el-button type="primary" class="flex-1">Go</el-button>');
    expect(insertBlock(html, built).qlId).toBe('2');
    expect(insertBlock(html, built, { beforeQlId: '1' })).toMatchObject({ html: '<h1>A</h1><el-button type="primary" class="flex-1">Go</el-button><p>B</p>', qlId: '1' });
    expect(insertBlock(html, built, { afterQlId: '0' }).qlId).toBe('1');
  });

  it('falls back to the end when the anchor is gone', () => {
    expect(insertBlock(html, built, { afterQlId: '9' }).html.endsWith('Go</el-button>')).toBe(true);
  });
});
