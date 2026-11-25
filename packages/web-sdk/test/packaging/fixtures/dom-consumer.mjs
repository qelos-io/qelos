// Runs the built web-sdk inside a real DOM (happy-dom) in its own process and prints what it did as JSON.
//   BUILD=esm|cjs   which module system to load the package with
//   BASE_URL        page origin; with FETCH=real the SDK talks to a real server there, with FETCH=stub it is recorded
// The package is loaded by name (`@qelos/web-sdk`), so it goes through its real exports map: from inside the
// package (self-reference) in the tests, or from a clean project that installed the packed tarball in the e2e.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Window } = require('happy-dom');

const base = process.env.BASE_URL || 'http://app.test';
const window = new Window({ url: `${base}/page?code=abc&token=tok1` });
const calls = [];
const hostMessages = [];

const fetchImpl =
  process.env.FETCH === 'real'
    ? window.fetch.bind(window)
    : async (url, init = {}) => {
        calls.push({ url: String(url), method: (init.method || 'GET').toUpperCase(), headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined });
        return new Response(JSON.stringify({ ok: true, echo: init.body ? JSON.parse(init.body).token : null }), { headers: { 'content-type': 'application/json' } });
      };

for (const key of ['document', 'location', 'localStorage', 'HTMLElement', 'customElements', 'MutationObserver', 'getComputedStyle', 'matchMedia']) {
  globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.fetch = fetchImpl;
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
// a real postMessage structured-clones synchronously, so record a copy (the SDK reuses its events array)
window.parent = { postMessage: (message, origin) => hostMessages.push({ message: JSON.parse(JSON.stringify(message)), origin }) };
window.requestAnimationFrame = globalThis.requestAnimationFrame;

const cjs = process.env.BUILD === 'cjs';
const load = (specifier) => (cjs ? require(specifier) : import(specifier));
const sdk = await load('@qelos/web-sdk');

const out = { exports: Object.keys(sdk).sort(), code: sdk.code };

out.authorize = await sdk.authorize();

// the host page tells the micro-frontend to authorize again with a new code and token
const reAuthorized = new Promise((resolve) => {
  window.__resolveReAuthorize = resolve;
});
const { Event } = window;
// onReAuthorize is not re-exported from the entry point: reach it through the documented deep path
const auth = await load('@qelos/web-sdk/dist/auth');
auth.onReAuthorize((data) => window.__resolveReAuthorize(data));
window.dispatchEvent(Object.assign(new Event('message'), { data: { qelosHostname: base, events: [{ eventName: 'reAuthorize', payload: { code: 'zzz', token: 'tok2' } }] } }));
out.reAuthorized = await reAuthorized;
out.codeAfter = auth.getCode();

await sdk.unAuthorize();
auth.reAuthorize();
await new Promise((r) => setTimeout(r, 20));

// the chat widget mounts into the page and cleans up after itself
const container = window.document.createElement('div');
window.document.body.appendChild(container);
try {
  new sdk.QelosChatWidget({ agentId: 'agent-1', appUrl: base, container });
} catch (e) {
  out.widgetOptionError = e.message;
}
const widget = new sdk.QelosChatWidget({ agentId: 'agent-1', appUrl: base, apiToken: 'qelos_pk_test', container });
out.widgetMounted = container.children.length;
widget.destroy();
out.widgetAfterDestroy = container.children.length;

out.calls = calls;
out.hostMessages = hostMessages;
console.log(JSON.stringify(out));
process.exit(0);
