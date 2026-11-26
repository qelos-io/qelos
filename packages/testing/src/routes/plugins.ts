import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { generateId, isValidId } from '../state/ids.js';
import { mayAct, type ActorResolver } from './actor.js';

/**
 * `sdk.managePlugins` of the administrator SDK, following `apps/plugins` (`controllers/manage-plugins.ts`):
 * anyone lists plugins (administrators see all their settings), administrators and plugins read one, administrators
 * change them. A plugin's manifest and callback are never fetched.
 */

const SCHEMA = ['name', 'description', 'manifestUrl', 'callbackUrl', 'registerUrl', 'apiPath', 'user', 'authAcquire', 'proxyUrl', 'subscribedEvents', 'microFrontends', 'injectables', 'navBarGroups', 'cruds'];
const LISTS = ['subscribedEvents', 'microFrontends', 'injectables', 'navBarGroups', 'cruds'];
/** what a caller who is not an administrator sees in the list */
const PUBLIC = ['_id', 'name', 'description', 'apiPath', 'callbackUrl', 'microFrontends', 'injectables', 'navBarGroups', 'cruds'];

const pick = (doc: Record<string, any>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => doc[key] !== undefined).map((key) => [key, doc[key]]));
const message = (text: string, status: number) => jsonResponse({ message: text }, status);
const withoutSecrets = ({ token: _token, auth: _auth, ...plugin }: Doc) => plugin;
const encodePath = (path: string) => path.replace(/[/\\]/g, ':');
const newPath = (name: string) => `${name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')}-${generateId().slice(-4)}`;

/** the fields of a request as the database stores them */
function stored(body: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = pick(body, SCHEMA);
  for (const list of LISTS) {
    if (!Array.isArray(fields[list])) continue;
    const defaults =
      list === 'microFrontends'
        ? { active: true, opened: true, requirements: [], roles: [], workspaceRoles: [], workspaceLabels: [], modal: { params: [] } }
        : {};
    fields[list] = fields[list].map((item: Record<string, any>) => ({ ...defaults, ...item, _id: item?._id ?? generateId() }));
  }
  if (fields.authAcquire) {
    // the refresh token itself goes to the secrets vault
    const { refreshToken: _, ...rest } = fields.authAcquire;
    fields.authAcquire = { refreshTokenKey: 'refresh_token', accessTokenKey: 'access_token', ...rest };
  }
  return fields;
}

export function pluginRoutes({ resolveActor }: { resolveActor: ActorResolver }) {
  return (router: Router, state: MockState) => {
    const plugins = state.plugins;
    const route = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      roles: string[],
      handler: (ctx: RouteContext, body: Record<string, any>) => unknown,
    ) =>
      router.register(method, path, async (ctx) => {
        if (!mayAct(await resolveActor(ctx), roles)) return new Response(null, { status: 401 });
        return handler(ctx, (await ctx.json()) ?? {});
      });
    const taken = (apiPath: string, id?: string) => !!plugins.findOne((p) => p.apiPath === apiPath && p._id !== id);

    router.register('GET', '/api/plugins', async (ctx) => {
      const full = mayAct(await resolveActor(ctx), ['admin']);
      return plugins.list().map((plugin) => (full ? withoutSecrets(plugin) : pick(plugin, PUBLIC)));
    });

    route('GET', '/api/plugins/:pluginId', ['admin', 'plugin'], ({ params }) => {
      const plugin = plugins.get(params.pluginId);
      if (plugin) return withoutSecrets(plugin);
      return isValidId(params.pluginId) ? jsonResponse(null) : message('could not find plugin', 404);
    });

    route('POST', '/api/plugins', ['admin'], (_ctx, body) => {
      const fields = stored(body);
      if (!fields.name) return message('could not create plugin', 500);
      const apiPath = encodePath(fields.apiPath || newPath(String(fields.name)));
      if (taken(apiPath)) return message('api path already taken by another plugin. choose another path.', 403);
      const keepsToken = body.token && !body.authAcquire?.refreshToken && !fields.manifestUrl;
      return plugins.insert({
        authAcquire: stored({ authAcquire: {} }).authAcquire,
        ...Object.fromEntries(LISTS.map((list) => [list, []])),
        ...fields,
        apiPath,
        ...(keepsToken ? { token: body.token } : {}),
        tenant: state.settings.tenantId,
        __v: 0,
      });
    });

    route('PUT', '/api/plugins/:pluginId', ['admin'], ({ params }, body) => {
      const plugin = plugins.get(params.pluginId);
      const fields = stored(body);
      if (fields.apiPath) fields.apiPath = encodePath(fields.apiPath);
      const refused = !plugin || (fields.name !== undefined && !fields.name) || (fields.apiPath && taken(fields.apiPath, plugin._id));
      if (refused) return message('could not update plugin', 500);
      if (body.token) fields.token = body.token;
      else if (body.clearToken) fields.token = '';
      return plugins.update(params.pluginId, fields);
    });

    route('DELETE', '/api/plugins/:pluginId', ['admin'], ({ params }) => {
      const plugin = plugins.get(params.pluginId);
      if (!plugin) return message('could not find plugin', 404);
      plugins.remove(plugin._id);
      return pick(plugin, ['_id', 'tenant', 'name', 'apiPath']);
    });
  };
}
