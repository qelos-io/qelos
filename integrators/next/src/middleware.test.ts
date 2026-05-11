import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { createQelosMiddleware } from './middleware';

describe('createQelosMiddleware /api/me identity', () => {
  const prevFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes('/api/me')) {
        const h = new Headers();
        h.append('set-cookie', 'sid=x; Path=/; Domain=.qelos.app; HttpOnly');
        return new Response(
          JSON.stringify({
            _id: 'user-1',
            username: 'u',
            email: 'u@example.com',
            roles: [],
            workspace: { _id: 'ws-1', name: 'W' },
          }),
          {
            status: 200,
            headers: h,
          },
        );
      }
      return new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = prevFetch;
  });

  it('forwards Set-Cookie from /api/me with Domain rewritten to the inbound host', async () => {
    const mw = createQelosMiddleware({
      config: {
        appUrl: 'https://upstream.example',
        disableProxy: true,
        skipPaths: ['/_next'],
      },
    });
    const req = new NextRequest('https://myapp.example/dashboard', {
      headers: { cookie: 'a=b', host: 'myapp.example' },
    });
    const res = await mw(req);
    const cookies = res.headers.getSetCookie?.() ?? [];
    assert.ok(
      cookies.some((c) => c.includes('Domain=myapp.example')),
      cookies.join(' | '),
    );
    assert.ok(!cookies.some((c) => c.includes('Domain=.qelos.app')));
  });
});
