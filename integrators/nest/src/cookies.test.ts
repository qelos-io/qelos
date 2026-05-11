// Run with: `pnpm -F @qelos/integrator-nest test` (includes src/**/*.test.ts)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteSetCookieDomain, rewriteSetCookieDomains } from './cookies';

describe('rewriteSetCookieDomain', () => {
  it('replaces a leading-dot Domain value', () => {
    const input = 'sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure';
    assert.equal(
      rewriteSetCookieDomain(input, 'example.com'),
      'sid=abc; Path=/; Domain=example.com; HttpOnly; Secure',
    );
  });

  it('replaces a wildcard Domain value', () => {
    const input = 'sid=abc; Path=/; Domain=*.qelos.app; HttpOnly';
    assert.equal(
      rewriteSetCookieDomain(input, 'example.com'),
      'sid=abc; Path=/; Domain=example.com; HttpOnly',
    );
  });

  it('returns the cookie unchanged when no Domain attribute is present', () => {
    const input = 'sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax';
    assert.equal(rewriteSetCookieDomain(input, 'example.com'), input);
  });

  it('strips the port from a host:port newDomain before substitution', () => {
    const input = 'sid=abc; Domain=.qelos.app; Path=/';
    assert.equal(
      rewriteSetCookieDomain(input, 'localhost:3000'),
      'sid=abc; Domain=localhost; Path=/',
    );
  });

  it('preserves attribute order and other attributes across replacement', () => {
    const input =
      'sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure; SameSite=Lax; Max-Age=3600';
    assert.equal(
      rewriteSetCookieDomain(input, 'example.com'),
      'sid=abc; Path=/; Domain=example.com; HttpOnly; Secure; SameSite=Lax; Max-Age=3600',
    );
  });

  it('preserves an Expires attribute (which contains commas) across replacement', () => {
    const input =
      'sid=abc; Domain=.qelos.app; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/';
    assert.equal(
      rewriteSetCookieDomain(input, 'example.com'),
      'sid=abc; Domain=example.com; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/',
    );
  });

  it('matches the Domain attribute name case-insensitively and preserves its casing', () => {
    const input = 'sid=abc; domain=.qelos.app; Path=/';
    assert.equal(
      rewriteSetCookieDomain(input, 'example.com'),
      'sid=abc; domain=example.com; Path=/',
    );
  });

  it('strips the entire Domain segment when newDomain is undefined', () => {
    const input =
      'sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure; SameSite=Lax';
    assert.equal(
      rewriteSetCookieDomain(input, undefined),
      'sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
    );
  });

  it('strips the entire Domain segment when newDomain is an empty string', () => {
    const input = 'sid=abc; Domain=.qelos.app; Path=/';
    assert.equal(
      rewriteSetCookieDomain(input, ''),
      'sid=abc; Path=/',
    );
  });

  it('removes the Domain segment when it is the last attribute', () => {
    const input = 'sid=abc; Path=/; Domain=.qelos.app';
    assert.equal(
      rewriteSetCookieDomain(input, undefined),
      'sid=abc; Path=/',
    );
  });
});

describe('rewriteSetCookieDomains', () => {
  it('applies the rewrite to each entry of an array', () => {
    const values = [
      'a=1; Domain=.qelos.app; Path=/',
      'b=2; Path=/; HttpOnly',
      'c=3; Domain=*.qelos.app; Secure',
    ];
    assert.deepEqual(rewriteSetCookieDomains(values, 'example.com'), [
      'a=1; Domain=example.com; Path=/',
      'b=2; Path=/; HttpOnly',
      'c=3; Domain=example.com; Secure',
    ]);
  });

  it('strips the Domain segment from each entry when newDomain is undefined', () => {
    const values = [
      'a=1; Domain=.qelos.app; Path=/',
      'b=2; Domain=*.qelos.app; HttpOnly',
    ];
    assert.deepEqual(rewriteSetCookieDomains(values, undefined), [
      'a=1; Path=/',
      'b=2; HttpOnly',
    ]);
  });
});
