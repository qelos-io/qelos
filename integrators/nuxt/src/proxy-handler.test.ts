import assert from 'node:assert/strict';
import * as http from 'node:http';
import { test } from 'node:test';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { proxyToQelos } from './proxy-handler';

const listen = (server: http.Server) =>
  new Promise<string>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`)),
  );

test('a redirect of the Qelos API reaches the browser, with its cookies', async (t) => {
  const asked: string[] = [];
  const upstream = http.createServer((req, res) => {
    asked.push(req.url!);
    if (req.url === '/api/auth/linkedin') {
      res.writeHead(302, { location: '/auth/callback?rt=abc', 'set-cookie': 'flow=1; Domain=qelos.example; Path=/' });
      return res.end();
    }
    res.writeHead(404);
    res.end();
  });
  const base = await listen(upstream);
  const app = createApp();
  app.use(defineEventHandler((event) => proxyToQelos(event, `${base}${event.path}`)));
  const server = http.createServer(toNodeListener(app));
  const origin = await listen(server);
  t.after(() => {
    server.close();
    upstream.close();
  });

  const res = await fetch(`${origin}/api/auth/linkedin`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/auth/callback?rt=abc');
  assert.match(res.headers.get('set-cookie')!, /^flow=1; Domain=127\.0\.0\.1/);
  assert.deepEqual(asked, ['/api/auth/linkedin'], 'the proxy does not follow the redirect');
});
