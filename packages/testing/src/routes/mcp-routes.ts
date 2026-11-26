import { createHash } from 'node:crypto';
import { jsonResponse, type RouteModule } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import { authenticate } from '../auth/authenticate.js';
import { claimFor, findUserByRef, pickWorkspace } from '../auth/accounts.js';
import { issueToken, randomToken } from '../auth/tokens.js';
import { isRedirectUriPermitted } from '../auth/mcp-callbacks.js';

/**
 * MCP sign-in (`sdk.authentication.getMcpAuthorizeUrl` / `exchangeMcpAuthorizationCode`), following
 * `apps/auth/server/controllers/mcp-oauth`. There is no approval page: a signed-in user, or `?persona=`, is sent
 * straight back to the app with a code. Clients are not registered, so `client_id` is ignored.
 */

const CODE_TTL_MS = 10 * 60 * 1000;

const challengeOf = (verifier: string, method: string) =>
  method === 'plain' ? verifier : createHash('sha256').update(verifier).digest('base64url');

export const mcpRoutes: RouteModule = (router, state) => {
  /** the seeded `mcp-configuration`; without one MCP sign-in is on, for any callback address */
  const configuration = () => state.configurations.findOne((c) => c.key === 'mcp-configuration')?.metadata;
  const enabled = () => !configuration() || !!configuration().enabled;
  const permitted = (redirectUri: string) =>
    URL.canParse(redirectUri) && (!configuration() || isRedirectUriPermitted(redirectUri, configuration().permittedCallbackUrls));

  const tokens = (user: Doc, workspaceId: string | undefined) => {
    const workspace = workspaceId ? claimFor(state.workspaces.get(workspaceId), user._id) : null;
    const access = issueToken(state, user, 'access', workspace);
    const refresh = issueToken(state, user, 'refresh', workspace, access.session.family);
    return {
      access_token: access.token,
      refresh_token: refresh.token,
      token_type: 'Bearer',
      expires_in: Math.floor(state.settings.auth.accessTokenTtlMs / 1000),
    };
  };

  router.register('GET', '/api/auth/mcp/authorize', ({ request, url, query }) => {
    const message = (text: string, status: number) => jsonResponse({ message: text }, status);
    const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });
    const redirectUri = query.get('redirect_uri');
    if (!redirectUri) return message('redirect_uri is required', 400);
    if (!enabled()) return message('MCP OAuth is not enabled for this tenant', 503);
    if (!permitted(redirectUri)) return message('redirect_uri is not permitted', 400);
    const challenge = query.get('code_challenge');
    const method = query.get('code_challenge_method');
    if (challenge && method !== 'S256' && method !== 'plain') return message('code_challenge_method must be S256 or plain', 400);

    const current = authenticate(request, state);
    const personaRef = query.get('persona');
    const user = current?.user ?? (personaRef ? findUserByRef(state, personaRef) : undefined);
    if (!user) return redirect(`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
    const workspaceId = (current?.workspace ?? pickWorkspace(state, user))?._id;

    const target = new URL(redirectUri);
    if (challenge && method) {
      const code = randomToken('mcp_');
      state.sessions.insert({
        kind: 'mcp-code',
        code,
        userId: user._id,
        workspaceId,
        redirectUri,
        challenge,
        method,
        expiresAt: Date.now() + CODE_TTL_MS,
      });
      target.searchParams.set('code', code);
    } else {
      // without PKCE the service puts the tokens themselves in the address
      for (const [key, value] of Object.entries(tokens(user, workspaceId))) target.searchParams.set(key, String(value));
    }
    const passState = query.get('state');
    if (passState) target.searchParams.set('state', passState);
    return redirect(target.toString());
  });

  router.register('POST', '/api/auth/mcp/token', async ({ request }) => {
    const error = (code: string, status = 400, description?: string) =>
      jsonResponse({ error: code, ...(description ? { error_description: description } : {}) }, status);
    // form encoded, as OAuth asks
    const body = new URLSearchParams(await request.clone().text());
    if (body.get('grant_type') !== 'authorization_code') return error('unsupported_grant_type');
    const [code, redirectUri, verifier] = ['code', 'redirect_uri', 'code_verifier'].map((key) => body.get(key));
    if (!code || !redirectUri || !verifier) return error('invalid_request');
    if (!enabled()) return error('temporarily_unavailable', 503);
    if (!permitted(redirectUri)) return error('invalid_request', 400, 'redirect_uri is not permitted');
    const stored = state.sessions.findOne((s) => s.kind === 'mcp-code' && s.code === code && s.expiresAt > Date.now());
    if (!stored || stored.redirectUri !== redirectUri || challengeOf(verifier, stored.method) !== stored.challenge) {
      return error('invalid_grant');
    }
    // a code works once
    state.sessions.remove(stored._id);
    const user = state.users.get(stored.userId);
    return user ? tokens(user, stored.workspaceId) : error('invalid_grant');
  });
};
