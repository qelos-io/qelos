import { jsonResponse, type RouteContext, type RouteModule } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import { isSignedIn, mayAct, type ActorResolver, type MockActor } from './actor.js';

/**
 * Configurations and blocks (`apps/content`), blueprints and components (`apps/no-code`): who may call each route,
 * the status codes and the response bodies of those services.
 */

const ADMINS = ['admin'];
/** who may change content blocks */
const BLOCK_EDITORS = ['editor', 'plugin', 'admin'];
/** who may change blueprints and components */
const DATA_EDITORS = ['plugin', 'admin'];

const APP_CONFIGURATION = 'app-configuration';
const CONFIGURATION_LIST_FIELDS = ['_id', 'key', 'tenant', 'public', 'kind', 'description', 'created'];
const BLUEPRINT_VIEWER_FIELDS = ['_id', 'tenant', 'identifier', 'name', 'description', 'properties', 'created', 'updated'];
const BLOCK_FIELDS = ['name', 'description', 'content', 'contentType'];

const pick = (doc: Record<string, any>, fields: string[]) =>
  Object.fromEntries(fields.filter((f) => doc[f] !== undefined).map((f) => [f, doc[f]]));
const message = (text: string, status: number) => jsonResponse({ message: text }, status);
/** how the content service refuses */
const notAuthorized = () => message('you are not authorized', 401);
/** how the data service refuses */
const unauthorized = () => new Response(null, { status: 401 });

type Handler = (ctx: RouteContext, actor: MockActor | null) => unknown;

export function contentRoutes({ resolveActor }: { resolveActor: ActorResolver }): RouteModule {
  return (router, state) => {
    const allow = (may: (actor: MockActor | null) => boolean, refuse: () => Response, handler: Handler) => async (ctx: RouteContext) => {
      const actor = await resolveActor(ctx);
      return may(actor) ? handler(ctx, actor) : refuse();
    };
    const admin = (handler: Handler) => allow((a) => mayAct(a, ADMINS), notAuthorized, handler);
    const blockEditor = (handler: Handler) => allow((a) => mayAct(a, BLOCK_EDITORS), notAuthorized, handler);
    const signedIn = (handler: Handler) => allow(isSignedIn, unauthorized, handler);
    const dataEditor = (handler: Handler) => allow((a) => mayAct(a, DATA_EDITORS), unauthorized, handler);
    const body = async (ctx: RouteContext): Promise<Record<string, any>> => (await ctx.json()) ?? {};
    const tenant = () => state.settings.tenantId;
    const now = () => new Date().toISOString();

    // ---------------------------------------------------------------- configurations
    const configs = state.configurations;
    const stored = (key: string) => configs.findOne((c) => c.key === key);
    /** the app configuration always exists */
    const configuration = (key: string): Doc | Omit<Doc, '_id'> | undefined =>
      stored(key) ?? (key === APP_CONFIGURATION ? { key, public: true, metadata: {} } : undefined);
    const noConfiguration = () => message('configuration not exists', 404);

    router.register('GET', '/api/configurations', admin(({ query }) => {
      const key = query.get('key');
      const pattern = key ? new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : undefined;
      const wantsPublic = query.get('public');
      const kind = query.get('kind');
      return configs
        .list(
          (c) =>
            (!pattern || pattern.test(String(c.key))) &&
            (!wantsPublic || (c.public !== false) === ['true', '1'].includes(wantsPublic)) &&
            (!kind || c.kind === kind),
        )
        .map((c) => pick({ public: true, tenant: tenant(), ...c }, CONFIGURATION_LIST_FIELDS));
    }));

    // anyone reads a public configuration; a private one is "not found" for everyone but administrators
    router.register('GET', '/api/configurations/:key', async (ctx) => {
      const actor = await resolveActor(ctx);
      const found = configuration(ctx.params.key);
      if (!found || (found.public === false && !mayAct(actor, ADMINS))) return noConfiguration();
      return {
        ...(actor?.roles.includes('admin') ? { kind: found.kind } : {}),
        tenant: found.tenant ?? tenant(),
        key: found.key,
        metadata: found.metadata ?? {},
      };
    });

    router.register('POST', '/api/configurations', admin(async (ctx) => {
      const data = await body(ctx);
      if (!data.key) return message('configuration creation failed', 400);
      if (stored(data.key)) return message(`Configuration with key '${data.key}' already exists for this tenant`, 409);
      return configs.insert({ tenant: tenant(), key: data.key, public: !!data.public, kind: data.kind, metadata: data.metadata || {}, created: now() });
    }));

    // only the description and the metadata (merged) can change
    router.register('PUT', '/api/configurations/:key', admin(async (ctx) => {
      const { key } = ctx.params;
      const current = stored(key);
      if (!current && key !== APP_CONFIGURATION) return noConfiguration();
      const data = await body(ctx);
      const changes: Record<string, unknown> = {};
      if (data.description) changes.description = data.description;
      if (data.metadata) changes.metadata = { ...current?.metadata, ...data.metadata };
      return current
        ? configs.update(current._id, changes)
        : configs.insert({ tenant: tenant(), key, public: true, metadata: {}, created: now(), ...changes });
    }));

    router.register('DELETE', '/api/configurations/:key', admin(({ params }) => {
      if (params.key === APP_CONFIGURATION) return message('cannot remove app configuration', 403);
      const current = stored(params.key);
      if (!current) return noConfiguration();
      configs.remove(current._id);
      return { _id: current._id, key: current.key };
    }));

    // ---------------------------------------------------------------- blocks
    const noBlock = () => message('block not exists', 404);
    const invalidBlock = (block: Record<string, any>) => !block.name || !['content', 'html'].includes(block.contentType);

    router.register('GET', '/api/blocks', blockEditor(({ query }) => {
      const limit = parseInt(query.get('limit') ?? '') || 30;
      const offset = parseInt(query.get('offset') ?? '') || 0;
      return state.blocks.list().slice(offset, offset + limit);
    }));
    // anyone reads one block; only editors get more than its content
    router.register('GET', '/api/blocks/:id', async (ctx) => {
      const actor = await resolveActor(ctx);
      const block = state.blocks.get(ctx.params.id);
      if (!block) return noBlock();
      return mayAct(actor, BLOCK_EDITORS) ? block : pick(block, ['_id', 'content']);
    });
    router.register('POST', '/api/blocks', blockEditor(async (ctx) => {
      const block = { contentType: 'content', ...pick(await body(ctx), BLOCK_FIELDS), tenant: tenant() };
      return invalidBlock(block) ? message('error while creating block, try again', 500) : state.blocks.insert(block);
    }));
    router.register('PUT', '/api/blocks/:id', blockEditor(async (ctx) => {
      const block = state.blocks.get(ctx.params.id);
      if (!block) return noBlock();
      const changes = pick(await body(ctx), BLOCK_FIELDS);
      if (invalidBlock({ contentType: 'content', ...block, ...changes })) return message('error while updating block, try again', 500);
      return state.blocks.update(block._id, changes);
    }));
    router.register('DELETE', '/api/blocks/:id', blockEditor(({ params }) => {
      if (!state.blocks.remove(params.id)) return noBlock();
      return { acknowledged: true, deletedCount: 1 };
    }));

    // ---------------------------------------------------------------- blueprints
    // `/api/blueprints/:bp/entities` has more segments, so there is no clash with the entities routes
    const blueprint = (identifier: string) => state.blueprints.findOne((b) => b.identifier === identifier);
    const noBlueprint = () => message('blueprint not found', 404);
    /** callers who cannot change blueprints do not get their permissions, relations and other settings */
    const view = (found: Doc, actor: MockActor | null) => (mayAct(actor, DATA_EDITORS) ? found : pick(found, BLUEPRINT_VIEWER_FIELDS));

    router.register('GET', '/api/blueprints', signedIn(({ query }, actor) => {
      const matches = (value: unknown, wanted: string | null) => wanted === null || new RegExp(wanted, 'i').test(String(value ?? ''));
      const identifiers = query.get('identifier')?.split(',');
      return state.blueprints
        .list((b) => matches(b.name, query.get('name')) && matches(b.description, query.get('description')) && (!identifiers || identifiers.includes(b.identifier)))
        .map((b) => view(b, actor));
    }));
    router.register('GET', '/api/blueprints/:identifier', signedIn(({ params }, actor) => {
      const found = blueprint(params.identifier);
      return jsonResponse(found ? view(found, actor) : null);
    }));
    router.register('POST', '/api/blueprints', dataEditor(async (ctx) => {
      const { storage: _, ...data } = await body(ctx);
      if (!data.identifier || blueprint(String(data.identifier))) return message('failed to create a blueprint', 400);
      return state.blueprints.insert({ ...data, tenant: tenant(), created: now(), updated: now() });
    }));
    router.register('PUT', '/api/blueprints/:identifier', dataEditor(async (ctx) => {
      const found = blueprint(ctx.params.identifier);
      if (!found) return noBlueprint();
      const { _id, tenant: _tenant, identifier: _identifier, created: _created, storage: _storage, ...changes } = await body(ctx);
      return state.blueprints.update(found._id, { ...changes, updated: now() });
    }));
    router.register('DELETE', '/api/blueprints/:identifier', dataEditor(({ params }) => {
      const found = blueprint(params.identifier);
      if (!found) return noBlueprint();
      if (state.entities.list(found.identifier).length) return message('cannot remove blueprint with existing entities', 400);
      state.blueprints.remove(found._id);
      return found;
    }));

    // ---------------------------------------------------------------- components
    const noComponent = () => message('component not found', 404);

    router.register('GET', '/api/components', dataEditor(() => state.components.list()));
    router.register('GET', '/api/components/:id', dataEditor(({ params }) => state.components.get(params.id) ?? noComponent()));
    router.register('POST', '/api/components', dataEditor(async (ctx) => state.components.insert((await body(ctx)) as any)));
    router.register('PUT', '/api/components/:id', dataEditor(async (ctx) => {
      const { _id, ...changes } = await body(ctx);
      return state.components.update(ctx.params.id, changes) ?? noComponent();
    }));
    router.register('DELETE', '/api/components/:id', dataEditor(({ params }) => {
      const found = state.components.get(params.id);
      if (!found) return noComponent();
      state.components.remove(found._id);
      return found;
    }));
  };
}
