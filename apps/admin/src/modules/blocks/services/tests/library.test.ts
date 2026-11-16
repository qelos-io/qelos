import {
  IDENTIFIER_PATTERN,
  componentUsageTag,
  contentBoxEmbed,
  extractComponentInfo,
  folderCrumbs,
  folderOf,
  listFolder,
  normalizeIdentifier,
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

  it('accepts path identifiers with slashes', () => {
    ['card', 'products/card', 'products/cards/product-card-2'].forEach((id) => expect(IDENTIFIER_PATTERN.test(id)).toBe(true));
    ['', '/card', 'card/', 'a//b', 'a/b.vue', 'a b', 'a/../b'].forEach((id) => expect(IDENTIFIER_PATTERN.test(id)).toBe(false));
  });

  it('normalizes pasted identifiers', () => {
    expect(normalizeIdentifier('products/ClientProductEditModal.vue')).toBe('products/ClientProductEditModal');
    expect(normalizeIdentifier(' /products//cards/ ')).toBe('products/cards');
    expect(normalizeIdentifier('products\\card')).toBe('products/card');
  });

  it('finds the folder of an identifier', () => {
    expect(folderOf('card')).toBe('');
    expect(folderOf('products/cards/card')).toBe('products/cards');
  });

  it('lists the direct folders and items of a folder', () => {
    const items = [
      { identifier: 'hero', componentName: 'Hero' },
      { identifier: 'products/card', componentName: 'Card' },
      { identifier: 'products/list', componentName: 'List' },
      { identifier: 'products/modals/edit', componentName: 'Edit' },
      { identifier: 'products-extra/x', componentName: 'X' },
      { identifier: 'admin/panel', componentName: 'Panel' },
    ];
    const root = listFolder(items);
    expect(root.files.map((i) => i.identifier)).toEqual(['hero']);
    expect(root.folders).toEqual([
      { name: 'admin', path: 'admin', count: 1 },
      { name: 'products', path: 'products', count: 3 },
      { name: 'products-extra', path: 'products-extra', count: 1 },
    ]);

    const products = listFolder(items, 'products');
    expect(products.files.map((i) => i.identifier)).toEqual(['products/card', 'products/list']);
    expect(products.folders).toEqual([{ name: 'modals', path: 'products/modals', count: 1 }]);
  });

  it('builds breadcrumb crumbs', () => {
    expect(folderCrumbs('')).toEqual([]);
    expect(folderCrumbs('a/b')).toEqual([{ name: 'a', path: 'a' }, { name: 'b', path: 'a/b' }]);
  });
});
