import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { isRedirectUriPermitted } from '../src/auth/mcp-callbacks.js';

/** Contract between the mock and MCP sign-in of the auth service: its address rules and the refusals of its controllers. */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'auth', 'server');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default ?? loaded;
};

/** every one of these is tried both as the permitted entry and as the address that asks to be returned to */
const HOSTS = [
  'https://app.example.org',
  'https://app.example.org.other.example',
  'https://app.example.org@other.example',
  'https://app.example.org:8443',
  'http://app.example.org',
  'https://claude.ai',
  'https://claude.ai.other.example',
  'https://app.devin.ai',
  'https://api.anthropic.com',
  'http://127.0.0.1',
  'http://127.0.0.1:5000',
  'http://localhost:50000',
  'http://localhost:6274',
  'http://[::1]:5000',
  'cursor://anysphere.cursor-mcp',
  'myapp://',
];
const PATHS = ['', '/', '/cb', '/cbx', '/cb/next', '/cb?x=1', '/callback', '/oauth/callback', '/mcp/oauth/callback'];
const WILDCARDS = [
  ...HOSTS.flatMap((host) => [`${host}*`, `${host}/*`, `${host}/cb*`]),
  ...['http://127.0.0.1', 'http://localhost', 'http://[::1]'].flatMap((host) => ['', '/', '/cb', '/*', '*'].map((path) => `${host}:*${path}`)),
  'http://localhost:5000*',
  'cursor://*',
  'https://*',
  '*',
  '',
];

describe('the mock follows MCP sign-in of the auth service', () => {
  test('which addresses a sign-in may return to', async () => {
    const real = await load('services/mcp-oauth-service');
    const addresses = HOSTS.flatMap((host) => PATHS.map((path) => host + path));
    let permitted = 0;
    for (const entry of [...addresses, ...WILDCARDS]) {
      for (const address of addresses) {
        const expected = real.isRedirectUriPermitted(address, [entry]);
        assert.equal(isRedirectUriPermitted(address, [entry]), expected, `${address} <- ${entry}`);
        if (expected) permitted++;
      }
    }
    assert.ok(permitted > 100);
  });

  test('refusals of the authorize and token routes', async () => {
    const { mcpAuthorize } = await load('controllers/mcp-oauth/authorize');
    const { mcpToken } = await load('controllers/mcp-oauth/token');
    const real = async (controller: Function, req: object) => {
      const answer: { status: number; body?: unknown } = { status: 200 };
      const res: any = {
        status: (code: number) => ((answer.status = code), res),
        json: (body: unknown) => ((answer.body = body), res),
        redirect: () => ((answer.status = 302), res),
        end: () => res,
      };
      await controller({ headers: { tenant: '0' }, query: {}, body: {}, ...req }, res);
      return answer;
    };
    const redirectUri = 'https://app.example.org/cb';
    for (const enabled of [true, false]) {
      const mcpConfig = { enabled, permittedCallbackUrls: [redirectUri] };
      const qelos = createMockQelos({
        logger: () => {},
        seed: { personas: [{ email: 'user@x.com' }], configurations: [{ key: 'mcp-configuration', metadata: mcpConfig }] },
      });
      const answerOf = async (res: Response) => {
        const text = await res.text();
        return { status: res.status, ...(text ? { body: JSON.parse(text) } : {}) };
      };
      const queries: Record<string, string>[] = [
        {},
        { redirect_uri: redirectUri },
        { redirect_uri: 'https://other.example/cb' },
        { redirect_uri: redirectUri, code_challenge: 'c' },
        { redirect_uri: redirectUri, code_challenge: 'c', code_challenge_method: 'md5' },
        { redirect_uri: redirectUri, code_challenge: 'c', code_challenge_method: 'plain' },
      ];
      for (const query of queries) {
        const expected = await real(mcpAuthorize, { mcpConfig, query });
        const answer = await answerOf(await qelos.fetch(`/api/auth/mcp/authorize?${new URLSearchParams(query)}`));
        assert.deepEqual(answer, expected, `authorize ${enabled} ${JSON.stringify(query)}`);
      }
      const complete = { grant_type: 'authorization_code', code: 'unknown', redirect_uri: redirectUri, code_verifier: 'v' };
      const bodies: Record<string, string>[] = [
        {},
        { grant_type: 'refresh_token' },
        { grant_type: 'authorization_code' },
        { ...complete, code_verifier: '' },
        { ...complete, redirect_uri: 'https://other.example/cb' },
        complete,
      ];
      for (const body of bodies) {
        const expected = await real(mcpToken, { mcpConfig, body });
        const answer = await answerOf(
          await qelos.fetch('/api/auth/mcp/token', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', [PERSONA_HEADER]: 'user@x.com' },
            body: new URLSearchParams(body).toString(),
          }),
        );
        assert.deepEqual(answer, expected, `token ${enabled} ${JSON.stringify(body)}`);
      }
    }
  });
});
