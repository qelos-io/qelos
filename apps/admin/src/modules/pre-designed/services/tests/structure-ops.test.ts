// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  annotateStructure,
  buildStructureRows,
  canMoveStep,
  describeElement,
  getElementByQlId,
  isEditableTag,
  moveElement,
  moveStep,
  parentQlId,
  parseStructure,
  qlIdOf,
  removeElement,
} from '../structure-ops';

const page = `<h1>Title</h1><div class="a"><el-button v-if="show">Go</el-button><quick-table :data="rows"></quick-table></div><p>End</p>`;

describe('isEditableTag', () => {
  it('accepts layout tags and custom components, not internals', () => {
    expect(isEditableTag('DIV')).toBe(true);
    expect(isEditableTag('quick-table')).toBe(true);
    expect(isEditableTag('el-option')).toBe(false);
    expect(isEditableTag('span')).toBe(false);
    expect(isEditableTag('span', ['span'])).toBe(true);
  });
});

describe('qlIds', () => {
  it('finds elements by index in document order, including inside templates', () => {
    const t = parseStructure('<div><template #x><span>in</span></template></div>');
    expect(getElementByQlId(t, '0')?.tagName).toBe('DIV');
    expect(getElementByQlId(t, '1')?.tagName).toBe('TEMPLATE');
    expect(getElementByQlId(t, '1-inner-0')?.tagName).toBe('SPAN');
    expect(getElementByQlId(t, '0-inner-0')).toBeNull();
    expect(getElementByQlId(t, '9')).toBeNull();
    expect(getElementByQlId(t, 'x')).toBeNull();
  });

  it('annotates every element with its id and editable ones with their tag', () => {
    const t = parseStructure('<div><span>a</span><quick-table></quick-table></div>');
    annotateStructure(t);
    const ids = Array.from(t.content.querySelectorAll('*')).map((el) => [el.getAttribute('data-ql-id'), el.getAttribute('data-ql-tag')]);
    expect(ids).toEqual([['0', 'div'], ['1', null], ['2', 'quick-table']]);
  });
});

describe('qlIdOf', () => {
  it('is the inverse of getElementByQlId, also inside templates', () => {
    const t = parseStructure('<div><template #x><span>in</span></template><p>b</p></div>');
    ['0', '1', '1-inner-0', '2'].forEach((id) => expect(qlIdOf(t, getElementByQlId(t, id)!)).toBe(id));
    expect(qlIdOf(t, document.createElement('i'))).toBeUndefined();
  });
});

describe('buildStructureRows', () => {
  it('lists editable blocks with depth, labels and conditions', () => {
    const rows = buildStructureRows(page);
    expect(rows.map((r) => [r.qlId, r.tag, r.depth])).toEqual([
      ['0', 'h1', 0],
      ['1', 'div', 0],
      ['2', 'el-button', 1],
      ['3', 'quick-table', 1],
      ['4', 'p', 0],
    ]);
    expect(rows[2]).toMatchObject({ label: 'Go', conditional: true });
    expect(rows[3].conditional).toBe(false);
  });

  it('descends into templates with their inner ids', () => {
    const rows = buildStructureRows('<quick-table><template #ops="{row}"><el-button v-for="x in row">x</el-button></template></quick-table>');
    expect(rows.map((r) => [r.qlId, r.tag, r.depth, r.repeated])).toEqual([
      ['0', 'quick-table', 0, false],
      ['1-inner-0', 'el-button', 1, true],
    ]);
  });

  it('handles empty markup', () => {
    expect(buildStructureRows('')).toEqual([]);
    expect(buildStructureRows(undefined)).toEqual([]);
  });
});

describe('describeElement', () => {
  it('prefers attributes, then own text, and shortens long text', () => {
    const t = parseStructure('<h1 title="Hello">x</h1><p>Some text</p><p>' + 'a'.repeat(60) + '</p>');
    const els = Array.from(t.content.querySelectorAll('*'));
    expect(describeElement(els[0])).toBe('Hello');
    expect(describeElement(els[1])).toBe('Some text');
    expect(describeElement(els[2]).length).toBe(40);
  });
});

describe('moving and removing', () => {
  it('moves a block before or after another', () => {
    expect(moveElement(page, '4', '0', 'before').startsWith('<p>End</p><h1>')).toBe(true);
    expect(moveElement(page, '0', '4', 'after').endsWith('<p>End</p><h1>Title</h1>')).toBe(true);
  });

  it('refuses to move a block into itself or its own children', () => {
    expect(moveElement(page, '1', '2', 'before')).toBe(page);
    expect(moveElement(page, '1', '1', 'after')).toBe(page);
    expect(moveElement(page, '9', '1', 'after')).toBe(page);
  });

  it('swaps with siblings and reports where it can move', () => {
    expect(canMoveStep(page, '0')).toEqual({ up: false, down: true });
    expect(canMoveStep(page, '4')).toEqual({ up: true, down: false });
    expect(moveStep(page, '4', 'up')).toContain('<p>End</p><div');
    expect(moveStep(page, '0', 'up')).toBe(page);
    expect(moveStep(page, '4', 'down')).toBe(page);
  });

  it('removes a block and returns it', () => {
    const { html, removed } = removeElement(page, '2');
    expect(html).not.toContain('el-button');
    expect(removed?.tagName.toLowerCase()).toBe('el-button');
    expect(removeElement(page, '99').html).toBe(page);
  });
});

describe('parentQlId', () => {
  it('finds the closest enclosing block', () => {
    expect(parentQlId(page, '2')).toBe('1');
    expect(parentQlId(page, '3')).toBe('1');
    expect(parentQlId(page, '0')).toBeUndefined();
  });

  it('skips non-block wrappers and handles elements inside a template', () => {
    const html = '<quick-table><template #ops="{row}"><el-button>x</el-button></template></quick-table>';
    expect(parentQlId('<div><span><el-button>x</el-button></span></div>', '2')).toBe('0');
    expect(parentQlId(html, '1-inner-0')).toBe('0');
  });
});
