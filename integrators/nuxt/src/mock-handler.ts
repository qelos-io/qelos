import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  getRequestHeader,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3';
import { rewriteSetCookieDomain } from './cookies';
import { getQelosMock } from './mock';
import type { QelosNuxtRuntimeConfig } from './types';

const SKIP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

/**
 * Answer the current H3/Nitro event from the Qelos mock (`@qelos/testing`)
 * instead of proxying it to a Qelos tenant.
 */
export async function serveFromMock(
  event: H3Event,
  config: QelosNuxtRuntimeConfig,
): Promise<Uint8Array | undefined> {
  const instance = await getQelosMock(config).get();
  if (!instance) {
    throw createError({ statusCode: 500, statusMessage: 'Qelos mock is not active' });
  }
  const originalHost = getRequestHeader(event, 'host');
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.node.req.headers)) {
    if (value === undefined || SKIP_HEADERS.has(name.toLowerCase())) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else headers.set(name, value);
  }
  const method = event.method || 'GET';
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event, false);
  const encrypted = (event.node.req.socket as { encrypted?: boolean } | undefined)?.encrypted;
  const url = `${encrypted ? 'https' : 'http'}://${originalHost || 'localhost'}${event.path}`;

  let response: Response;
  try {
    response = await instance.handle(
      new Request(url, { method, headers, body: body as unknown as BodyInit | undefined }),
    );
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: 'QELOS_MOCK_ERROR', message: (err as Error).message });
  }

  setResponseStatus(event, response.status);
  response.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (SKIP_HEADERS.has(lower) || lower === 'set-cookie') return;
    setResponseHeader(event, name, value);
  });
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    appendResponseHeader(event, 'set-cookie', rewriteSetCookieDomain(cookie, originalHost));
  }
  const buf = new Uint8Array(await response.arrayBuffer());
  return buf.length ? buf : undefined;
}

/** Event handler serving every request from the mock. */
export function createMockApiHandler(config: QelosNuxtRuntimeConfig) {
  return defineEventHandler((event) => serveFromMock(event, config));
}
