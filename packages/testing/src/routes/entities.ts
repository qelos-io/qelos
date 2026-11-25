import { randomUUID } from 'node:crypto';
import { MockHttpError, type RouteContext, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { generateId } from '../state/ids.js';
import { isAdmin, type ActorResolver, type MockActor } from './actor.js';
import {
  buildFilter,
  buildMetadataInput,
  buildSorter,
  getPagination,
  identifierOf,
  metadataOf,
  parseQuery,
  validateMetadata,
  type BlueprintDoc,
} from './entities-query.js';

type Operation = 'create' | 'read' | 'update' | 'delete';
type Scopes = true | string[];

const PUBLIC_USER_DATA = ['firstName', 'lastName', 'profileImage'];
const PUBLIC_WS_DATA = ['name', 'logo'];

/** Mirrors `getUserPermittedScopes` of the no-code service. `true` = unrestricted. */
function permittedScopes(actor: MockActor | null, blueprint: BlueprintDoc, operation: Operation): Scopes {
  if (isAdmin(actor)) return true;
  const user = actor!;
  const scopes = (blueprint.permissions || [])
    .filter((p) => {
      if (p.operation !== operation) return false;
      if (p.guest) return true;
      if (p.workspaceLabelsBased?.length) {
        const found = p.workspaceLabelsBased.some((l: string) => l === '*' || user.workspace?.labels?.includes(l));
        if (!found) return false;
      }
      return (
        p.roleBased?.some((r: string) => r === '*' || user.roles.includes(r)) ||
        (user.workspace?.roles && p.workspaceRoleBased?.some((r: string) => r === '*' || user.workspace!.roles!.includes(r)))
      );
    })
    .map((p) => p.scope || 'user');
  return Array.from(new Set(scopes));
}

/** Throws 403 when not permitted; otherwise returns a predicate limiting the entities the actor may touch. */
function authorize(actor: MockActor | null, blueprint: BlueprintDoc, operation: Operation) {
  const scopes = permittedScopes(actor, blueprint, operation);
  if (scopes !== true && !scopes.length) throw new MockHttpError(403, 'not permitted');
  let scopeFilter: (e: Doc) => boolean = () => true;
  if (scopes !== true && !scopes.includes('tenant')) {
    if (blueprint.permissionScope === 'workspace') {
      const ws = actor?.workspace?._id;
      if (!ws) throw new MockHttpError(403, 'user is not connected to a workspace');
      scopeFilter = (e) => String(e.workspace) === String(ws);
    } else if (blueprint.permissionScope === 'user') {
      if (!actor?._id) throw new MockHttpError(401, 'you must be logged in to access');
      scopeFilter = (e) => String(e.user) === String(actor._id);
    }
  }
  return { unrestricted: scopes === true, scopeFilter };
}

function flatDefault(query: Record<string, any>, headers: Headers): boolean {
  if ((headers.get('accept-version') || '').toLowerCase().split(',').some((p) => p.trim() === 'v1')) return true;
  const v = query.$flat;
  if (v === undefined || v === null) return true;
  if (v === false || v === 0) return false;
  return !['false', '0'].includes(String(v).toLowerCase());
}

/** The entity as returned by the API: `id`, optionally flattened metadata, no `_id`. */
function present(entity: Doc, blueprint: BlueprintDoc, flat: boolean): Record<string, any> {
  const { _id, auditInfo, ...rest } = entity;
  const metadata = structuredClone(metadataOf(entity, blueprint));
  const out: Record<string, any> = { ...rest, identifier: identifierOf(entity), metadata };
  out.id = out.identifier;
  if (flat) Object.assign(out, metadata);
  return out;
}

const pick = (doc: Doc | undefined, keys: string[]) =>
  doc ? Object.fromEntries([['_id', doc._id], ...keys.filter((k) => k in doc).map((k) => [k, doc[k]])]) : undefined;

function getBlueprint(state: MockState, identifier: string): BlueprintDoc {
  const blueprint = state.blueprints.findOne((b) => b.identifier === identifier);
  if (!blueprint) throw new MockHttpError(404, 'blueprint not found');
  return blueprint as BlueprintDoc;
}

function findEntity(state: MockState, blueprint: string, id: string): Doc | undefined {
  return state.entities.list(blueprint).find((e) => identifierOf(e) === id || e._id === id);
}

function populate(state: MockState, blueprint: BlueprintDoc, shaped: Record<string, any>[], flat: boolean) {
  for (const entity of shaped) {
    for (const relation of blueprint.relations || []) {
      const id = entity.metadata[relation.key];
      if (!id) continue;
      const target = findEntity(state, relation.target, String(id));
      const targetBp = state.blueprints.findOne((b) => b.identifier === relation.target) as BlueprintDoc | undefined;
      const value = target && targetBp ? present(target, targetBp, flat) : undefined;
      entity.metadata[relation.key] = value;
      if (flat) entity[relation.key] = value;
    }
    entity.user = pick(state.users.get(String(entity.user)), PUBLIC_USER_DATA);
    entity.workspace = pick(state.workspaces.get(String(entity.workspace)), PUBLIC_WS_DATA);
  }
}

function parseOuterPopulate(value: any): Array<{ setKey: string; target: string; scope?: string; limit?: any; sort?: string }> {
  if (!value) return [];
  if (typeof value === 'string' || Array.isArray(value)) {
    return ([] as string[]).concat(value).flatMap((s) =>
      s.split(',').map((item) => {
        const [setKey, target, scope] = item.split(':');
        return { setKey, target, scope };
      }),
    );
  }
  return Object.entries(value).map(([setKey, cfg]) => ({ setKey, ...(cfg as any) }));
}

function outerPopulate(
  state: MockState,
  blueprint: BlueprintDoc,
  shaped: Record<string, any>[],
  items: ReturnType<typeof parseOuterPopulate>,
  actor: MockActor | null,
  flat: boolean,
) {
  for (const { setKey, target, scope, limit, sort } of items) {
    const targetBp = state.blueprints.findOne((b) => b.identifier === target) as BlueprintDoc | undefined;
    const relation = targetBp?.relations?.find((r) => r.target === blueprint.identifier);
    if (!targetBp || !relation) continue;
    let allowed: (e: Doc) => boolean;
    try {
      allowed = authorize(actor, targetBp, 'read').scopeFilter;
    } catch {
      continue;
    }
    let pool = state.entities.list(target).filter(allowed);
    if (scope === 'user') pool = pool.filter((e) => String(e.user) === String(actor?._id));
    else if (scope === 'workspace') pool = pool.filter((e) => String(e.workspace) === String(actor?.workspace?._id));
    if (sort) pool.sort(buildSorter(sort, targetBp));
    for (const entity of shaped) {
      let related = pool.filter((e) => metadataOf(e, targetBp)[relation.key] === entity.identifier);
      if (limit) related = related.slice(0, parseInt(limit) || related.length);
      entity[setKey] = related.map((e) => present(e, targetBp, flat));
    }
  }
}

function checkRelations(state: MockState, blueprint: BlueprintDoc, metadata: Record<string, any>) {
  for (const relation of blueprint.relations || []) {
    const target = metadata[relation.key];
    if (target && !findEntity(state, relation.target, String(target))) {
      throw new MockHttpError(406, `relation target ${relation.target} not found: ${target}`);
    }
  }
}

export interface EntitiesRoutesOptions {
  resolveActor: ActorResolver;
}

/** `/api/blueprints/:blueprint/entities` (+ `charts/count`), mirroring the no-code entities controller. */
export function entitiesRoutes({ resolveActor }: EntitiesRoutesOptions): RouteModule {
  return (router, state) => {
    const context = async (ctx: RouteContext) => ({
      actor: await resolveActor(ctx),
      blueprint: getBlueprint(state, ctx.params.blueprint),
      query: parseQuery(ctx.query),
    });
    const base = '/api/blueprints/:blueprint/entities';

    router.register('GET', base, async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { scopeFilter } = authorize(actor, blueprint, 'read');
      const flat = flatDefault(query, ctx.request.headers);
      const { limit, skip } = getPagination(query);
      const items = state.entities.list(blueprint.identifier).filter(scopeFilter).filter(buildFilter(query, blueprint));
      items.sort(buildSorter(query.$sort, blueprint));
      const page = items.slice(skip || 0, limit === undefined ? undefined : (skip || 0) + limit);
      const shaped = page.map((e) => present(e, blueprint, flat));
      if (query.$populate) populate(state, blueprint, shaped, flat);
      if (query.$outerPopulate) outerPopulate(state, blueprint, shaped, parseOuterPopulate(query.$outerPopulate), actor, flat);
      return shaped;
    });

    router.register('GET', '/api/blueprints/:blueprint/charts/count', async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { scopeFilter } = authorize(actor, blueprint, 'read');
      return { count: state.entities.list(blueprint.identifier).filter(scopeFilter).filter(buildFilter(query, blueprint)).length };
    });

    router.register('GET', `${base}/:id`, async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { scopeFilter } = authorize(actor, blueprint, 'read');
      const entity = findEntity(state, blueprint.identifier, ctx.params.id);
      if (!entity || !scopeFilter(entity)) throw new MockHttpError(404, 'entity not found');
      const flat = flatDefault(query, ctx.request.headers);
      const shaped = present(entity, blueprint, flat);
      if (query.$populate) populate(state, blueprint, [shaped], flat);
      return shaped;
    });

    router.register('POST', base, async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { unrestricted } = authorize(actor, blueprint, 'create');
      const body = (await ctx.json()) || {};
      const metadata = validateMetadata(buildMetadataInput({}, body, blueprint), blueprint);
      checkRelations(state, blueprint, metadata);
      const now = new Date().toISOString();
      const mechanism = blueprint.entityIdentifierMechanism;
      const id = mechanism && mechanism !== 'objectid' ? randomUUID() : generateId();
      const entity = state.entities.insert(blueprint.identifier, {
        _id: id,
        identifier: id,
        blueprint: blueprint.identifier,
        user: (unrestricted && body.user) || actor?._id,
        workspace: (unrestricted && body.workspace) || actor?.workspace?._id,
        metadata,
        created: now,
        updated: now,
      });
      return present(entity, blueprint, flatDefault(query, ctx.request.headers));
    });

    router.register('PUT', `${base}/:id`, async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { unrestricted, scopeFilter } = authorize(actor, blueprint, 'update');
      const entity = findEntity(state, blueprint.identifier, ctx.params.id);
      if (!entity || !scopeFilter(entity)) throw new MockHttpError(404, 'entity not found');
      const body = (await ctx.json()) || {};
      const metadata = validateMetadata(buildMetadataInput(metadataOf(entity, blueprint), body, blueprint), blueprint);
      checkRelations(state, blueprint, metadata);
      const patch: Record<string, any> = { metadata, updated: new Date().toISOString() };
      if (unrestricted && body.user) patch.user = body.user;
      if (unrestricted && body.workspace) patch.workspace = body.workspace;
      const updated = state.entities.update(blueprint.identifier, entity._id, patch)!;
      return present(updated, blueprint, flatDefault(query, ctx.request.headers));
    });

    // registered before `:id` so "all" is not treated as an identifier
    router.register('DELETE', `${base}/all`, async (ctx) => {
      const { actor, blueprint } = await context(ctx);
      const { scopeFilter } = authorize(actor, blueprint, 'delete');
      const targets = state.entities.list(blueprint.identifier).filter(scopeFilter);
      for (const e of targets) state.entities.remove(blueprint.identifier, e._id);
      return { deletedCount: targets.length };
    });

    router.register('DELETE', `${base}/:id`, async (ctx) => {
      const { actor, blueprint, query } = await context(ctx);
      const { scopeFilter } = authorize(actor, blueprint, 'delete');
      const entity = findEntity(state, blueprint.identifier, ctx.params.id);
      if (!entity || !scopeFilter(entity)) throw new MockHttpError(404, 'entity not found');
      state.entities.remove(blueprint.identifier, entity._id);
      return present(entity, blueprint, flatDefault(query, ctx.request.headers));
    });
  };
}
