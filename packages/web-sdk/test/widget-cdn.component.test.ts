import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The CDN entry (`widget-cdn`): it configures and mounts the widget from its own <script> tag's data attributes.
 * It runs at import time, so every case gets its own process.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function load(attributes: Record<string, string>) {
  const code = `
    import { Window } from 'happy-dom';
    const window = new Window({ url: 'http://site.test/' });
    const script = window.document.createElement('script');
    for (const [k, v] of Object.entries(${JSON.stringify(attributes)})) script.setAttribute(k, v);
    window.document.head.appendChild(script);
    Object.assign(globalThis, { window, document: window.document, HTMLScriptElement: window.HTMLScriptElement });
    const errors = [];
    console.error = (...a) => errors.push(a.map((x) => x?.message ?? String(x)).join(' '));
    await import('./src/widget-cdn.ts');
    await new Promise((r) => setTimeout(r, 20));
    const host = window.document.querySelector('[data-qelos-chat-widget]');
    console.log(JSON.stringify({
      global: typeof window.QelosChatWidget,
      mounted: Boolean(host),
      title: host?.shadowRoot.querySelector('.title').textContent ?? null,
      open: host?.shadowRoot.querySelector('.panel').getAttribute('data-open') ?? null,
      errors,
    }));
    process.exit(0);
  `;
  const out = execFileSync(process.execPath, ['--no-warnings', '--import', 'tsx', '--input-type=module', '-e', code], { cwd: root, encoding: 'utf8', timeout: 30_000 });
  return JSON.parse(out.trim().split('\n').pop()!);
}

describe('the CDN script', () => {
  test('mounts the widget from the data attributes of its script tag and exposes the class', () => {
    const out = load({ 'data-agent-id': 'a1', 'data-app-url': 'https://qelos.test', 'data-api-token': 'pk', 'data-header-text': 'Support', 'data-auto-open': 'true' });
    assert.deepEqual(out, { global: 'function', mounted: true, title: 'Support', open: 'true', errors: [] });
  });

  test('does nothing without an agent id and app url, but still exposes the class', () => {
    const out = load({ 'data-header-text': 'Support' });
    assert.deepEqual(out, { global: 'function', mounted: false, title: null, open: null, errors: [] });
  });

  test('logs a clear error instead of throwing when the token is missing', () => {
    const out = load({ 'data-agent-id': 'a1', 'data-app-url': 'https://qelos.test' });
    assert.equal(out.mounted, false);
    assert.equal(out.errors.length, 1);
    assert.match(out.errors[0], /apiToken|accessToken/);
  });
});
