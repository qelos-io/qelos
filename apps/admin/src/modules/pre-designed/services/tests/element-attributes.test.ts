// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { attributeFields, fieldType, hasEditableText, parseStyle, readElement, serializeStyle, writeElement } from '../element-attributes';

const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content.firstElementChild as Element;
};

describe('style', () => {
  it('parses and serializes rows, keeping urls with colons', () => {
    expect(parseStyle('color: red; background: url(http://x.y/a.png);;')).toEqual([
      { property: 'color', value: 'red' },
      { property: 'background', value: 'url(http://x.y/a.png)' },
    ]);
    expect(parseStyle('')).toEqual([]);
    expect(serializeStyle([{ property: 'color', value: 'red' }, { property: '', value: 'x' }])).toBe('color: red;');
    expect(serializeStyle([])).toBe('');
  });
});

describe('fields', () => {
  it('detects types', () => {
    expect(fieldType('disabled', 'true').type).toBe('switch');
    expect(fieldType('v-bind:size', 'small').type).toBe('select');
    expect(fieldType('background-color', '#fff').type).toBe('color');
    expect(fieldType('title', 'x').type).toBe('text');
  });

  it('lists attributes with primary ones first, dynamic ones last and internals hidden', () => {
    const fields = attributeFields(el('<el-button v-if="x" data-ql-id="3" class="a" id="b" disabled="true" label="L" foo="1" title="T">'));
    expect(fields.map((f) => f.propName)).toEqual(['title', 'label', 'disabled', 'foo', 'v-if']);
    expect(fields[2]).toMatchObject({ type: 'switch', value: true });
    expect(fields[4].dynamic).toBe(true);
  });
});

describe('read / write', () => {
  it('round-trips id, classes, style, html and attributes', () => {
    const node = el('<div id="a" class="x y" style="color: red;" title="T">hi</div>');
    const state = readElement(node);
    expect(state).toMatchObject({ id: 'a', classes: ['x', 'y'], html: 'hi' });
    state.id = '';
    state.classes = ['z'];
    state.style = [{ property: 'margin', value: '0' }];
    state.html = '<b>new</b>';
    state.fields = [{ propName: 'title', value: 'U' }, { propName: 'disabled', value: true }];
    writeElement(node, state);
    expect(node.outerHTML).toBe('<div class="z" style="margin: 0;" title="U" disabled="true"><b>new</b></div>');
  });

  it('leaves the content alone when html is undefined', () => {
    const node = el('<p>keep</p>');
    writeElement(node, { id: '', classes: [], style: [], fields: [] });
    expect(node.innerHTML).toBe('keep');
  });

  it('knows which blocks have text', () => {
    expect(hasEditableText(el('<img>'))).toBe(false);
    expect(hasEditableText(el('<h1>'))).toBe(true);
  });
});
