import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmailUsername } from '../email-username';

describe('normalizeEmailUsername', () => {
  it('returns error when username is undefined', () => {
    const result = normalizeEmailUsername(undefined);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'username is required');
  });

  it('returns error when username is null', () => {
    const result = normalizeEmailUsername(null);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'username is required');
  });

  it('returns error when username is empty string', () => {
    const result = normalizeEmailUsername('');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'username is required');
  });

  it('returns error when username is not a string', () => {
    const result = normalizeEmailUsername(42);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'username is required');
  });

  it('returns error when normalized username has no @', () => {
    const result = normalizeEmailUsername('notanemail');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'username should be an email address');
  });

  it('lowercases the username', () => {
    const result = normalizeEmailUsername('User@Example.COM');
    assert.equal(result.valid, true);
    assert.equal(result.username, 'user@example.com');
  });

  it('trims whitespace', () => {
    const result = normalizeEmailUsername('  user@example.com  ');
    assert.equal(result.valid, true);
    assert.equal(result.username, 'user@example.com');
  });

  it('replaces spaces with +', () => {
    const result = normalizeEmailUsername('user name@example.com');
    assert.equal(result.valid, true);
    assert.equal(result.username, 'user+name@example.com');
  });

  it('returns valid result for a well-formed email', () => {
    const result = normalizeEmailUsername('alice@example.com');
    assert.equal(result.valid, true);
    assert.equal(result.username, 'alice@example.com');
  });
});
