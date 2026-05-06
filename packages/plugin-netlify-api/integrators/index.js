'use strict';

/**
 * Netlify implementation of the Qelos integrator contract.
 *
 * Framework integrators (Express/Fastify/etc.) populate `req.qelos.user` and
 * `req.qelos.workspace` from the gateway-injected `user` header. Netlify Functions
 * sit outside the gateway, so this module calls the Qelos auth `/api/me` endpoint
 * with the visitor's credentials and exposes the same shape on `event.qelos`.
 */

const DEFAULT_API_URL = 'http://159.203.152.168';

function resolveApiHost(override) {
  const raw =
    override ?? process.env.QELOS_API_IP ?? process.env.API_HOST ?? DEFAULT_API_URL;
  const trimmed = String(raw).trim().replace(/\/$/, '');
  if (!trimmed) return DEFAULT_API_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function pickHeader(headers, name) {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== want) continue;
    if (v == null) continue;
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function publicHostForEvent(event) {
  const forwarded = pickHeader(event.headers, 'x-forwarded-host');
  if (forwarded) return forwarded.split(',')[0].trim();
  const host = pickHeader(event.headers, 'host');
  if (host) return host;
  if (event.rawUrl) {
    try {
      return new URL(event.rawUrl).hostname;
    } catch {
      // fall through
    }
  }
  return '';
}

function hasAuthCredentials(headers) {
  const auth = pickHeader(headers, 'authorization');
  const apiKey = pickHeader(headers, 'x-api-key');
  const cookie = pickHeader(headers, 'cookie');
  if (auth || apiKey) return true;
  return Boolean(cookie && cookie.includes('qlt_'));
}

function buildIdentityHeaders(event, options) {
  const headers = { 'content-type': 'application/json' };
  const cookie = pickHeader(event.headers, 'cookie');
  const authorization = pickHeader(event.headers, 'authorization');
  const apiKey = pickHeader(event.headers, 'x-api-key');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  if (apiKey) headers['x-api-key'] = apiKey;

  const tenantHost = options.tenantHost || publicHostForEvent(event);
  if (tenantHost) headers.tenanthost = tenantHost;

  const tenant =
    options.tenant ||
    pickHeader(event.headers, 'tenant') ||
    process.env.QELOS_TENANT;
  if (tenant) headers.tenant = tenant;

  for (const passthrough of [
    'x-impersonate-tenant',
    'x-impersonate-user',
    'x-impersonate-workspace',
  ]) {
    const value = pickHeader(event.headers, passthrough);
    if (value) headers[passthrough] = value;
  }

  return headers;
}

async function fetchMe(apiHost, headers, signal) {
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      '@qelos/plugin-netlify-api/integrators requires a global fetch (Node >= 18).',
    );
  }
  const res = await fetchImpl(`${apiHost}/api/me`, { headers, signal });
  if (res.status !== 200) return null;
  return res.json();
}

/**
 * Resolve the calling visitor's user and active workspace by hitting the Qelos
 * auth service. Returns `null` when the request carries no Qelos credentials or
 * the credentials are rejected.
 */
async function identifyUser(event, options = {}) {
  if (!event || !hasAuthCredentials(event.headers)) return null;

  const apiHost = resolveApiHost(options.apiHost);
  const headers = buildIdentityHeaders(event, options);

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 2000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const user = await fetchMe(apiHost, headers, controller.signal);
    if (!user || typeof user !== 'object') return null;
    return { user, workspace: user.workspace || null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function attachQelos(event, identity) {
  Object.defineProperty(event, 'qelos', {
    value: {
      user: identity?.user || null,
      workspace: identity?.workspace || null,
    },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return event;
}

/**
 * Wrap a Netlify Function handler so `event.qelos.user` / `event.qelos.workspace`
 * are populated before the handler runs. Unauthenticated requests still reach the
 * handler with `event.qelos.user === null`.
 */
function withQelos(handler, options = {}) {
  return async function qelosWrappedHandler(event, context) {
    const identity = await identifyUser(event, options);
    attachQelos(event, identity);
    return handler(event, context);
  };
}

/**
 * Like `withQelos`, but short-circuits with 401 when no user can be identified.
 */
function requireUser(handler, options = {}) {
  return async function qelosRequireUserHandler(event, context) {
    const identity = await identifyUser(event, options);
    if (!identity || !identity.user) {
      return {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'UNAUTHORIZED' }),
      };
    }
    attachQelos(event, identity);
    return handler(event, context);
  };
}

module.exports = {
  identifyUser,
  withQelos,
  requireUser,
  resolveApiHost,
};
