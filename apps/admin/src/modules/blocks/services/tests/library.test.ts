import {
  componentUsageTag,
  contentBoxEmbed,
  extractComponentInfo,
  htmlToText,
  matchesQuery,
  parseCompileError,
  parsePropsJson,
  toKebab,
} from '../library';

describe('library helpers', () => {
  it('splits a compile error into message and snippet', () => {
    expect(parseCompileError('Unexpected token\n\n  1 | <template>\n  2 |   <div>')).toEqual({
      message: 'Unexpected token',
      snippet: '  1 | <template>\n  2 |   <div>',
    });
    expect(parseCompileError('Just a message')).toEqual({ message: 'Just a message', snippet: '' });
    expect(parseCompileError(undefined)).toBeNull();
  });

  it('builds kebab-case identifiers', () => {
    expect(toKebab('MyFancyCard')).toBe('my-fancy-card');
    expect(toKebab('Hero  Banner_2')).toBe('hero-banner-2');
    expect(toKebab('-weird--Name-')).toBe('weird-name');
  });

  it('extracts info from an imported .vue file', () => {
    const info = extractComponentInfo('<!-- A pricing table -->\n<template><div/></template>', 'pricing-table.vue');
    expect(info).toEqual({ componentName: 'PricingTable', identifier: 'pricing-table', description: 'A pricing table' });
    expect(extractComponentInfo('<template/>', 'Hero.vue').description).toBe('Hero component');
  });

  it('shows how to use a component and a content box', () => {
    expect(componentUsageTag('PricingTable')).toBe('<pricing-table></pricing-table>');
    expect(contentBoxEmbed('abc')).toBe('<content-box identifier="abc"></content-box>');
  });

  it('parses props JSON safely', () => {
    expect(parsePropsJson('')).toEqual({ value: {}, error: '' });
    expect(parsePropsJson('{"a":1}')).toEqual({ value: { a: 1 }, error: '' });
    expect(parsePropsJson('[1]').error).toMatch(/object/);
    expect(parsePropsJson('{oops').error).not.toBe('');
  });

  it('turns html into short plain text', () => {
    expect(htmlToText('<h1>Hello</h1><p>big&nbsp;world</p><style>p{}</style>')).toBe('Hello big world');
    expect(htmlToText('<p>' + 'x'.repeat(200) + '</p>', 20)).toHaveLength(20);
    expect(htmlToText(null)).toBe('');
  });

  it('matches every word of a query', () => {
    expect(matchesQuery('hero ban', 'Hero banner', 'top of page')).toBe(true);
    expect(matchesQuery('hero footer', 'Hero banner')).toBe(false);
    expect(matchesQuery('', 'anything')).toBe(true);
  });
});
