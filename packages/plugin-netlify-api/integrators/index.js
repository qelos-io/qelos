'use strict';

/**
 * Netlify implementation of the Qelos integrator contract — same per-request
 * {@link QelosRequestContext} shape as `@qelos/integrator-express` (`user`,
 * `workspace`, `workspaces`, `sdk`, `tokens`).
 */

const { createRequestSdk } = require('./sdk-factory');
const {
  resolveApiHost,
  normalizeIntegratorConfig,
  pickHeader,
  readTokensFromEvent,
} = require('./request-parse');

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

/**
 * Headers forwarded on every SDK request for multi-tenant / impersonation
 * (matches the former `/api/me` integration identity headers).
 */
function buildStaticRequestHeaders(event, options) {
  const headers = {};
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

function shouldSkip(event, config) {
  if (!config.skipPaths?.length) return false;
  let path = event.path;
  if (!path && event.rawUrl) {
    try {
      path = new URL(event.rawUrl).pathname;
    } catch {
      path = '';
    }
  }
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

function mergeResponseCookies(result, responseCookies) {
  if (!responseCookies.length) return result;
  const base = result && typeof result === 'object' ? result : {};
  const headers = { ...(base.headers || {}) };
  const existing = headers['set-cookie'];
  const merged = Array.isArray(existing)
    ? [...existing, ...responseCookies]
    : existing
      ? [existing, ...responseCookies]
      : [...responseCookies];
  headers['set-cookie'] = merged;
  return { ...base, headers };
}

function attachQelosContext(event, ctx) {
  Object.defineProperty(event, 'qelos', {
    value: ctx,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return event;
}

async function populateUserAndWorkspaces(ctx, event, options) {
  try {
    ctx.user = await ctx.sdk.authentication.getLoggedInUser();
  } catch {
    ctx.user = null;
    return false;
  }

  try {
    ctx.workspaces = await ctx.sdk.workspaces.getList();
  } catch {
    ctx.workspaces = [];
  }

  if (ctx.user && ctx.workspaces.length) {
    if (options.resolveWorkspace) {
      ctx.workspace =
        (await options.resolveWorkspace({
          event,
          user: ctx.user,
          workspaces: ctx.workspaces,
        })) || null;
    } else {
      ctx.workspace = ctx.workspaces[0] || null;
    }
  }
  return true;
}

/**
 * Resolve user/workspace/workspaces using the same SDK flow as Express.
 * Returns `null` when there is no auth material or identity cannot be resolved.
 */
async function identifyUser(event, options = {}) {
  if (!event) return null;

  const config = normalizeIntegratorConfig(options);
  const tokens = readTokensFromEvent(event, config);
  const responseCookies = [];
  const staticRequestHeaders = buildStaticRequestHeaders(event, options);

  const hasAuthMaterial = Boolean(
    config.apiToken || tokens.accessToken || tokens.refreshToken,
  );
  if (!hasAuthMaterial) return null;

  const sdk = createRequestSdk({
    config,
    tokens,
    event,
    responseCookies,
    onTokenRefresh: options.onTokenRefresh,
    staticRequestHeaders,
  });

  const ctx = {
    user: null,
    workspace: null,
    workspaces: [],
    sdk,
    tokens,
  };

  await populateUserAndWorkspaces(ctx, event, options);
  if (!ctx.user) return null;

  return {
    user: ctx.user,
    workspace: ctx.workspace,
    workspaces: ctx.workspaces,
    sdk: ctx.sdk,
    tokens: ctx.tokens,
    refreshedCookies: responseCookies,
  };
}

function withQelos(handler, options = {}) {
  return async function qelosWrappedHandler(event, context) {
    if (shouldSkip(event, normalizeIntegratorConfig(options))) {
      return handler(event, context);
    }

    const config = normalizeIntegratorConfig(options);
    const tokens = readTokensFromEvent(event, config);
    const responseCookies = [];
    const staticRequestHeaders = buildStaticRequestHeaders(event, options);

    const sdk = createRequestSdk({
      config,
      tokens,
      event,
      responseCookies,
      onTokenRefresh: options.onTokenRefresh,
      staticRequestHeaders,
    });

    const ctx = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    attachQelosContext(event, ctx);

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken,
    );

    if (!hasAuthMaterial) {
      if (config.requireAuth) {
        return {
          statusCode: 401,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: 'UNAUTHORIZED' }),
        };
      }
      return mergeResponseCookies(
        await handler(event, context),
        responseCookies,
      );
    }

    const ok = await populateUserAndWorkspaces(ctx, event, options);
    if (!ok) {
      if (config.requireAuth) {
        return {
          statusCode: 401,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: 'UNAUTHORIZED' }),
        };
      }
      return mergeResponseCookies(
        await handler(event, context),
        responseCookies,
      );
    }

    return mergeResponseCookies(
      await handler(event, context),
      responseCookies,
    );
  };
}

function requireUser(handler, options = {}) {
  return async function qelosRequireUserHandler(event, context) {
    if (shouldSkip(event, normalizeIntegratorConfig(options))) {
      return handler(event, context);
    }

    const config = normalizeIntegratorConfig(options);
    const tokens = readTokensFromEvent(event, config);
    const responseCookies = [];
    const staticRequestHeaders = buildStaticRequestHeaders(event, options);

    const sdk = createRequestSdk({
      config,
      tokens,
      event,
      responseCookies,
      onTokenRefresh: options.onTokenRefresh,
      staticRequestHeaders,
    });

    const ctx = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    attachQelosContext(event, ctx);

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken,
    );
    if (!hasAuthMaterial || !(await populateUserAndWorkspaces(ctx, event, options))) {
      return {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'UNAUTHORIZED' }),
      };
    }

    return mergeResponseCookies(
      await handler(event, context),
      responseCookies,
    );
  };
}

module.exports = {
  identifyUser,
  withQelos,
  requireUser,
  resolveApiHost,
  normalizeIntegratorConfig,
  readTokensFromEvent,
  createRequestSdk,
};
