import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { getDisplayNames, getPlural } from '../../src/crud';

describe('getPlural', () => {
  test('adds "s" to regular words', () => {
    assert.equal(getPlural('book'), 'books');
  });

  test('adds "es" after x, h and s', () => {
    assert.equal(getPlural('box'), 'boxes');
    assert.equal(getPlural('dish'), 'dishes');
    assert.equal(getPlural('bus'), 'buses');
  });

  test('turns a final "y" into "ies"', () => {
    assert.equal(getPlural('category'), 'categories');
  });

  test('looks at the last letter case-insensitively but keeps the original casing', () => {
    assert.equal(getPlural('BOX'), 'BOXes');
    assert.equal(getPlural('Party'), 'Parties');
  });
});

describe('getDisplayNames', () => {
  test('builds the lower-case plural and the capitalized forms', () => {
    assert.deepEqual(getDisplayNames('blog post'), {
      name: 'blog post',
      plural: 'blog posts',
      capitalized: 'Blog Post',
      capitalizedPlural: 'Blog Posts',
    });
  });

  test('handles the "y" and "es" endings in the capitalized plural too', () => {
    const { plural, capitalizedPlural } = getDisplayNames('product category');
    assert.equal(plural, 'product categories');
    assert.equal(capitalizedPlural, 'Product Categories');
  });
});
