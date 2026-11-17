import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIMIT, getPagination } from '../entity-pagination.service';

describe('getPagination', () => {
  it('returns nothing when no paging params are sent', () => {
    assert.deepEqual(getPagination({}), { limit: undefined, skip: undefined });
  });

  it('keeps $limit alone without skip', () => {
    assert.deepEqual(getPagination({ $limit: '20' }), { limit: 20, skip: undefined });
  });

  it('falls back to DEFAULT_LIMIT for an invalid $limit', () => {
    assert.equal(getPagination({ $limit: 'abc' }).limit, DEFAULT_LIMIT);
  });

  describe('$skip', () => {
    it('uses $skip as an offset', () => {
      assert.deepEqual(getPagination({ $limit: '10', $skip: '30' }), { limit: 10, skip: 30 });
    });

    it('supports $skip=0', () => {
      assert.deepEqual(getPagination({ $limit: '10', $skip: '0' }), { limit: 10, skip: 0 });
    });

    it('applies DEFAULT_LIMIT when $skip is sent without $limit', () => {
      assert.deepEqual(getPagination({ $skip: '5' }), { limit: DEFAULT_LIMIT, skip: 5 });
    });

    it('clamps negative or invalid $skip to 0', () => {
      assert.equal(getPagination({ $skip: '-5' }).skip, 0);
      assert.equal(getPagination({ $skip: 'abc' }).skip, 0);
    });
  });

  describe('$page', () => {
    it('converts 1-based $page to an offset', () => {
      assert.deepEqual(getPagination({ $limit: '10', $page: '1' }), { limit: 10, skip: 0 });
      assert.deepEqual(getPagination({ $limit: '10', $page: '3' }), { limit: 10, skip: 20 });
    });

    it('uses DEFAULT_LIMIT as page size when $limit is missing', () => {
      assert.deepEqual(getPagination({ $page: '2' }), { limit: DEFAULT_LIMIT, skip: DEFAULT_LIMIT });
    });

    it('treats invalid, zero or negative $page as page 1', () => {
      assert.equal(getPagination({ $limit: '10', $page: 'abc' }).skip, 0);
      assert.equal(getPagination({ $limit: '10', $page: '0' }).skip, 0);
      assert.equal(getPagination({ $limit: '10', $page: '-2' }).skip, 0);
    });
  });

  describe('both $skip and $page', () => {
    it('picks $skip and ignores $page', () => {
      assert.deepEqual(getPagination({ $limit: '10', $skip: '5', $page: '3' }), { limit: 10, skip: 5 });
    });

    it('picks $skip=0 over $page', () => {
      assert.deepEqual(getPagination({ $limit: '10', $skip: '0', $page: '4' }), { limit: 10, skip: 0 });
    });

    it('picks $skip over $page without $limit', () => {
      assert.deepEqual(getPagination({ $skip: '7', $page: '2' }), { limit: DEFAULT_LIMIT, skip: 7 });
    });

    it('falls back to $page when $skip is empty', () => {
      assert.deepEqual(getPagination({ $limit: '10', $skip: '', $page: '2' }), { limit: 10, skip: 10 });
    });
  });
});
