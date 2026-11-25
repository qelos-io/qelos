// Starts a real plugin (Fastify) against a fake Qelos tenant, in its own process, and prints what happened as JSON.
//   PLUGIN_ENTRY   what to load: a bare specifier (clean project) or an absolute path (inside the repo)
//   BUILD=cjs|esm  load it with require() or with import (named exports)
// The fake tenant lives in this process, so the plugin's startup sign-in goes over real HTTP.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(process.cwd() + '/');
const { PLUGIN_ENTRY, BUILD = 'cjs', PORT, INTERNAL_PORT } = process.env;
const tenantLog = [];

const tenant = createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    tenantLog.push(`${req.method} ${req.url}`);
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/signin') return res.end(JSON.stringify({ payload: { token: 'tok', refreshToken: 'ref', user: { _id: 'u1', email: 'a@x.com' } } }));
    res.end('{}');
  });
});
await new Promise((r) => tenant.listen(0, '127.0.0.1', r));

process.env.QELOS_URL = `http://127.0.0.1:${tenant.address().port}`;
process.env.QELOS_USERNAME = 'plugin';
process.env.QELOS_PASSWORD = 'secret';
process.env.HOST = '127.0.0.1';
process.env.NODE_ENV = 'production';
process.env.APP_URL = `http://127.0.0.1:${PORT}`;

const play =
  BUILD === 'esm'
    ? await import(isAbsolute(PLUGIN_ENTRY) ? pathToFileURL(PLUGIN_ENTRY).href : PLUGIN_ENTRY)
    : require(PLUGIN_ENTRY);

const out = { api: Object.keys(play).filter((k) => k !== 'default').sort() };

play.addEndpoint('/hello', { verifyToken: false, handler: async () => ({ hello: 'world' }) });
play.addInternalEndpoint('/internal/ping', { handler: async () => ({ pong: true }) });
await play.start({ manifest: { name: 'demo-plugin', description: 'demo', appUrl: `http://127.0.0.1:${PORT}` } });

const get = async (port, path) => {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: res.status, body: await res.json() };
};
out.hello = await get(PORT, '/hello');
out.manifest = await get(PORT, '/api/play-manifest');
out.internal = await get(INTERNAL_PORT, '/internal/ping');
out.missing = (await fetch(`http://127.0.0.1:${PORT}/nope`)).status;
out.tenantLog = tenantLog;
console.log(JSON.stringify(out));
process.exit(0);
