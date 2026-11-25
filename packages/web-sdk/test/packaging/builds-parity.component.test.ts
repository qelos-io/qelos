import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { consumerScript, packageRoot } from './helpers';

/**
 * Component test: the real web-sdk modules (events bridge, authorization, chat widget) working together
 * inside a real DOM (happy-dom), loaded from the ES module build and from the CommonJS build, each in its own
 * process. Both builds must make the same requests, talk to the host page the same way and mount the same DOM.
 */
type Result = Record<string, any>;

const run = (build: 'esm' | 'cjs'): Result =>
  JSON.parse(
    execFileSync(process.execPath, ['--no-warnings', consumerScript], {
      cwd: packageRoot,
      env: { ...process.env, BUILD: build, FETCH: 'stub', BASE_URL: 'http://app.test' },
      encoding: 'utf8',
      timeout: 30_000,
    })
      .trim()
      .split('\n')
      .pop()!,
  );

let esm: Result;
let cjs: Result;

before(() => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/web-sdk build` before the tests');
  esm = run('esm');
  cjs = run('cjs');
});

describe('the ES module and CommonJS builds behave the same in a real DOM', () => {
  test('both builds produce identical results', () => {
    assert.deepEqual(esm, cjs);
  });

  for (const build of ['esm', 'cjs'] as const) {
    describe(`${build.toUpperCase()} build`, () => {
      const result = () => (build === 'esm' ? esm : cjs);

      test('reads the page code from the URL and authorizes with the token from the query string', () => {
        assert.equal(result().code, 'abc');
        assert.deepEqual(result().calls[0], {
          url: '/api/authorize',
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: { returnUrl: 'http://app.test/page', token: 'tok1' },
        });
        assert.equal(result().authorize.echo, 'tok1');
      });

      test('re-authorizes when the host page sends a new code and token, and tells subscribers', () => {
        assert.equal(result().codeAfter, 'zzz');
        assert.equal(result().reAuthorized.echo, 'tok2');
        assert.equal(result().calls[1].body.token, 'tok2');
      });

      test('un-authorize sends the current code, and events reach the host page', () => {
        assert.deepEqual(result().calls[2], { url: '/api/un-authorize', method: 'POST', headers: { code: 'zzz' } });
        const batches = result().hostMessages.map((m: any) => m.message);
        assert.ok(batches.some((b: any) => b.from === 'qelos-mfe' && b.events.some((e: any) => e.eventName === 'reAuthorize')));
        assert.equal(result().hostMessages[0].origin, 'http://app.test');
      });

      test('the chat widget validates its options, mounts into the container and cleans up', () => {
        assert.match(result().widgetOptionError, /apiToken|accessToken/);
        assert.equal(result().widgetMounted, 1);
        assert.equal(result().widgetAfterDestroy, 0);
      });
    });
  }
});
