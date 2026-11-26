import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { isValidId, generateId } from '../state/ids.js';
import { mayAct, type ActorResolver, type MockActor } from './actor.js';
import { checkEnd, type Side } from '../integrations/operations.js';
import {
  connectionStatus,
  InvalidMetadata,
  isConnectionKind,
  keptCredentials,
  validateMetadata,
} from '../integrations/connections.js';
import { agentIntegration } from '../ai/agents.js';

/**
 * `sdk.integrations`, `sdk.integrationSources` and `sdk.manageLambdas` of the administrator SDK, following
 * `apps/plugins`. Integrations and connections are for administrators and plugins, functions for administrators;
 * a refused caller gets an empty `401`. No provider is ever called.
 */

const MANAGERS = ['admin', 'plugin'];
const pick = (doc: Record<string, any>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => doc[key] !== undefined).map((key) => [key, doc[key]]));
const message = (text: string, status: number) => jsonResponse({ message: text }, status);
const FUNCTION_PROVIDERS = ['aws', 'cloudflare'];
const WORKER_NAME = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const TRUE = [true, 'true', 1, '1', 'yes'];

/** empty objects are not stored */
const minimize = (value: any): any => {
  if (Array.isArray(value)) return value.map(minimize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, v]) => [key, minimize(v)])
      .filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v as object).length)),
  );
};

type Handler = (ctx: RouteContext, body: Record<string, any>, actor: MockActor | null) => unknown;

export function integrationRoutes({ resolveActor }: { resolveActor: ActorResolver }) {
  return (router: Router, state: MockState) => {
    const route = (roles: string[]) => (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, handler: Handler) =>
      router.register(method, path, async (ctx) => {
        const actor = await resolveActor(ctx);
        if (!mayAct(actor, roles)) return new Response(null, { status: 401 });
        return handler(ctx, (await ctx.json()) ?? {}, actor);
      });
    const manage = route(MANAGERS);
    const administer = route(['admin']);
    const tenant = () => state.settings.tenantId;
    const now = () => new Date().toISOString();
    const owner = (actor: MockActor | null) => {
      const plugin = state.plugins.findOne((p) => !!actor?._id && p.user === actor._id);
      return { user: actor?._id, ...(plugin ? { plugin: plugin._id } : {}) };
    };

    // ---------------------------------------------------------------- integrations
    /** agents are integrations too: seeded `agents` are listed with them, in the shape they are stored in */
    const kindOf = (source: string) => state.connections.get(source)?.kind as string | undefined;
    const asIntegration = (doc: Doc): Doc => {
      const shaped: Doc =
        doc.trigger || doc.target
          ? doc
          : { ...agentIntegration(doc), _id: doc._id, active: doc.active !== false, tenant: doc.tenant ?? tenant(), created: doc.created };
      if (shaped.kind) return shaped;
      const kind = [kindOf(shaped.trigger?.source), kindOf(shaped.target?.source)];
      return kind.every(Boolean) ? { ...shaped, kind } : shaped;
    };
    const integrations = () => [...state.integrations.list(), ...state.agents.list()].map(asIntegration);
    const holding = (id: string) => [state.integrations, state.agents].find((collection) => collection.get(id));
    const found = (id: string) => {
      const doc = holding(id)?.get(id);
      return doc && asIntegration(doc);
    };
    const steps = (list: unknown) =>
      (Array.isArray(list) ? list : []).map((step) => ({ ...pick(step ?? {}, ['map', 'populate', 'clean', 'abort']), _id: step?._id ?? generateId() }));

    /** the checked ends of a request, with the kinds of their connections, or the refusal of the first bad one */
    function checkEnds(body: Record<string, any>, sides: Side[]) {
      const ends: Partial<Record<Side, { kind: string; end: Record<string, any> }>> = {};
      for (const side of sides) {
        const checked = checkEnd(side, body[side], kindOf);
        if ('error' in checked) return message(checked.error, 400);
        ends[side] = { kind: checked.kind, end: { ...checked.end, _id: generateId() } };
      }
      return ends;
    }

    manage('GET', '/api/integrations', ({ query }) => {
      const ids = query.getAll('id').concat(query.getAll('_id')).flatMap((id) => id.split(','));
      const source = query.get('source');
      const active = query.get('active');
      const kind = query.get('kind');
      const equals: Array<[string, (doc: Doc) => unknown]> = [
        ['plugin', (d) => d.plugin],
        ['user', (d) => d.user],
        ['trigger.source', (d) => d.trigger?.source],
        ['target.source', (d) => d.target?.source],
        // ends are stored without a kind, so these match nothing, as in the service
        ['trigger.kind', (d) => d.trigger?.kind],
        ['target.kind', (d) => d.target?.kind],
      ];
      return integrations().filter(
        (doc) =>
          equals.every(([name, read]) => !query.get(name) || read(doc) === query.get(name)) &&
          (!kind || ([] as string[]).concat(doc.kind ?? []).includes(kind)) &&
          (!source || doc.trigger?.source === source || doc.target?.source === source) &&
          (active === null || !!doc.active === ['true', '1'].includes(active)) &&
          (!ids.length || ids.includes(doc._id)),
      );
    });

    manage('GET', '/api/integrations/:integrationId', ({ params, query }) => {
      const integration = found(params.integrationId);
      if (!integration) return message('Integration not found', 404);
      if (!['true', '1'].includes(query.get('$populate') ?? '')) return integration;
      const populate = (end: Record<string, any>) => {
        const connection = state.connections.get(end?.source);
        return connection ? { ...end, source: withoutSecrets(connection) } : end;
      };
      return { ...integration, trigger: populate(integration.trigger), target: populate(integration.target) };
    });

    manage('POST', '/api/integrations', (_ctx, body, actor) => {
      const { trigger, target, dataManipulation, targetManipulation, active } = body;
      if (!trigger || !target) return message('trigger and target are required', 400);
      const ends = checkEnds(body, ['trigger', 'target']);
      if (ends instanceof Response) return ends;
      const integration = minimize({
        tenant: tenant(),
        ...owner(actor),
        kind: [ends.trigger!.kind, ends.target!.kind],
        active: TRUE.includes(active),
        trigger: ends.trigger!.end,
        target: ends.target!.end,
        dataManipulation: steps(dataManipulation),
        targetManipulation: steps(targetManipulation),
        created: now(),
        __v: 0,
      });
      return state.integrations.insert(integration);
    });

    manage('PUT', '/api/integrations/:integrationId', ({ params }, body) => {
      const integration = found(params.integrationId);
      if (!integration) return message('integration not found', 404);
      const ends = checkEnds(body, (['trigger', 'target'] as Side[]).filter((side) => body[side]));
      if (ends instanceof Response) return ends;
      const kind = [...(integration.kind ?? [])];
      if (ends.trigger) kind[0] = ends.trigger.kind;
      if (ends.target) kind[1] = ends.target.kind;
      const changed = minimize({
        ...integration,
        ...(body.active !== undefined ? { active: TRUE.includes(body.active) } : {}),
        ...(ends.trigger ? { trigger: ends.trigger.end } : {}),
        ...(ends.target ? { target: ends.target.end } : {}),
        ...(ends.trigger || ends.target ? { kind } : {}),
        ...(body.dataManipulation ? { dataManipulation: steps(body.dataManipulation) } : {}),
        ...(body.targetManipulation ? { targetManipulation: steps(body.targetManipulation) } : {}),
      });
      return holding(params.integrationId)!.replace(params.integrationId, changed);
    });

    manage('DELETE', '/api/integrations/:integrationId', ({ params }) => {
      const integration = found(params.integrationId);
      if (!integration) return message('integration not found', 404);
      holding(params.integrationId)!.remove(params.integrationId);
      return integration;
    });

    // ---------------------------------------------------------------- connections (integration sources)
    const connections = state.connections;
    const withoutSecrets = ({ authentication: _, ...connection }: Doc) => connection;

    manage('GET', '/api/integration-sources', ({ query }) => {
      const kind = query.get('kind');
      return connections.list((c) => !kind || c.kind === kind).map(withoutSecrets);
    });

    manage('GET', '/api/integration-sources/:sourceId', ({ params }) => {
      const connection = connections.get(params.sourceId);
      return connection ? withoutSecrets(connection) : new Response(null, { status: 404 });
    });

    manage('POST', '/api/integration-sources', (_ctx, body, actor) => {
      const { authentication, name, labels, kind, metadata } = body;
      let validated;
      let credentials;
      try {
        validated = validateMetadata(kind, metadata);
      } catch (e) {
        return message(e instanceof InvalidMetadata ? e.message : 'invalid metadata', 400);
      }
      try {
        credentials = keptCredentials(kind, authentication);
      } catch {
        return message(`invalid authentication data for kind: ${kind}`, 400);
      }
      if (!credentials || !name || !isConnectionKind(kind)) return message('could not create integration source', 500);
      const connection = minimize({
        tenant: tenant(),
        name,
        labels: labels ?? [],
        kind,
        metadata: validated,
        ...owner(actor),
        created: now(),
        __v: 0,
      });
      return withoutSecrets(connections.insert({ ...connection, authentication: credentials }));
    });

    manage('PUT', '/api/integration-sources/:sourceId', ({ params }, body) => {
      const connection = connections.get(params.sourceId);
      if (!connection) return new Response(null, { status: 404 });
      const { authentication, name, labels, metadata } = body;
      const changes: Record<string, unknown> = { ...(name ? { name } : {}), ...(labels ? { labels } : {}) };
      try {
        if (metadata) changes.metadata = validateMetadata(connection.kind, metadata) || connection.metadata;
        if (typeof authentication === 'object' && Object.keys(authentication).length) {
          const credentials = keptCredentials(connection.kind, authentication);
          if (credentials) changes.authentication = credentials;
        }
      } catch {
        return message('could not update integration source', 500);
      }
      return withoutSecrets(connections.update(connection._id, changes)!);
    });

    manage('DELETE', '/api/integration-sources/:sourceId', ({ params }) => {
      const connection = connections.get(params.sourceId);
      if (!connection) return message('integration source not found', 404);
      connections.remove(connection._id);
      return withoutSecrets(connection);
    });

    const object = (value: unknown) =>
      value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
    const status = (kind: string, metadata: unknown, authentication: unknown) => {
      const result = connectionStatus(kind, metadata, authentication);
      return 'refused' in result ? jsonResponse({ message: result.refused, code: result.code }, 400) : result;
    };

    manage('POST', '/api/integration-sources/status', (_ctx, { kind, metadata, authentication }) => {
      if (!isConnectionKind(kind)) return jsonResponse({ message: 'kind is required', code: 'MISSING_KIND' }, 400);
      if (!object(metadata)) return jsonResponse({ message: 'metadata is required', code: 'MISSING_METADATA' }, 400);
      return status(kind, metadata, authentication);
    });

    manage('POST', '/api/integration-sources/:sourceId/status', ({ params }, body) => {
      const connection = connections.get(params.sourceId);
      if (!connection) {
        return isValidId(params.sourceId)
          ? jsonResponse({ message: 'integration source not found', code: 'INTEGRATION_SOURCE_NOT_FOUND' }, 404)
          : jsonResponse({ message: 'invalid source id', code: 'INVALID_SOURCE_ID' }, 400);
      }
      // the request may override settings and non-empty credentials
      const overrides = Object.fromEntries(
        Object.entries(object(body.authentication) ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      );
      return status(connection.kind, { ...connection.metadata, ...object(body.metadata) }, { ...connection.authentication, ...overrides });
    });

    // ---------------------------------------------------------------- functions (lambdas)
    const functions = () => state.collection('functions');
    const view = (kind: string, fn: Doc) =>
      kind === 'aws'
        ? pick(fn, ['name', 'runtime', 'description', 'timeout', 'memorySize', 'role', 'handler'])
        : { ...pick(fn, ['name', 'code', 'entryPoint', 'bindings']), runtime: 'javascript' };
    /** the settings a request changes: empty ones are left as they are */
    const settings = (body: Record<string, any>) =>
      Object.fromEntries(
        Object.entries(pick(body, ['runtime', 'description', 'timeout', 'memorySize', 'role', 'handler', 'code', 'entryPoint', 'bindings'])).filter(([, v]) => !!v),
      );

    /** a route of one function provider connection; `failure` is the answer when the provider would fail */
    const provider = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      handler: (source: Doc, fn: Doc | undefined, body: Record<string, any>, failure: () => Response) => unknown,
      failed: string,
    ) =>
      administer(method, `/api/lambdas/:sourceId${path}`, ({ params }, body) => {
        const source = connections.get(params.sourceId);
        if (!source) return message('Source not found', 404);
        if (!FUNCTION_PROVIDERS.includes(source.kind)) return message('Unsupported source kind', 400);
        const name = params.functionName ?? body.name;
        const fn = functions().findOne((f) => f.sourceId === source._id && f.name === name);
        return handler(source, fn, { ...body, name }, () => message(failed, 500));
      });

    provider('GET', '', (source) => functions().list((f) => f.sourceId === source._id).map((f) => view(source.kind, f)), 'Error listing functions');

    provider('GET', '/:functionName', (source, fn, _body, failure) => (fn ? view(source.kind, fn) : failure()), 'Error getting function');

    provider(
      'POST',
      '',
      (source, fn, body, failure) => {
        const { name } = body;
        if (source.kind === 'cloudflare' && !(typeof name === 'string' && name.length <= 63 && WORKER_NAME.test(name))) {
          return message('Invalid Cloudflare worker name', 400);
        }
        // AWS refuses a name that is taken; Cloudflare replaces the worker
        if (!name || (fn && source.kind === 'aws')) return failure();
        if (fn) functions().remove(fn._id);
        const created = functions().insert({ sourceId: source._id, name, ...settings(body) });
        return jsonResponse(view(source.kind, created), 201);
      },
      'Error creating function',
    );

    provider(
      'PUT',
      '/:functionName',
      (source, fn, body, failure) => {
        if (!fn && source.kind === 'aws') return failure();
        const updated = fn
          ? functions().update(fn._id, settings(body))!
          : functions().insert({ sourceId: source._id, name: body.name, ...settings(body) });
        return view(source.kind, updated);
      },
      'Error updating function',
    );

    provider(
      'DELETE',
      '/:functionName',
      (source, fn, _body, failure) => {
        if (!fn && source.kind === 'aws') return failure();
        if (fn) functions().remove(fn._id);
        return new Response(null, { status: 204 });
      },
      'Error deleting function',
    );
  };
}
