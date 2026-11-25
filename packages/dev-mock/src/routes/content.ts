import { MockHttpError, type RouteContext, type RouteModule } from '../router/router.js';
import type { Collection } from '../state/mock-state.js';
import { requireAdmin, type ActorResolver } from './actor.js';

interface CrudOptions {
  path: string;
  collection: (state: Parameters<RouteModule>[1]) => Collection;
  /** field used in the URL to address a document, in addition to `_id` */
  key?: string;
  /** label for "not found" messages */
  label: string;
  /** reads need an admin (default: reads are open) */
  adminRead?: boolean;
  resolveActor: ActorResolver;
  /** documents that non-admins may read (only used with adminRead) */
  readableByAll?: (doc: Record<string, any>) => boolean;
}

/** List/get open to everyone, create/update/delete for admin personas (or when there is no persona). */
function crud(o: CrudOptions): RouteModule {
  const find = (c: Collection, id: string) => c.findOne((d) => d._id === id || (!!o.key && d[o.key] === id));
  return (router, state) => {
    const col = o.collection(state);
    const canRead = async (ctx: RouteContext, doc?: Record<string, any>) => {
      if (!o.adminRead) return;
      const actor = await o.resolveActor(ctx);
      if (doc && o.readableByAll?.(doc)) return;
      requireAdmin(actor);
    };
    router.register('GET', o.path, async (ctx) => {
      await canRead(ctx);
      return col.list();
    });
    router.register('GET', `${o.path}/:id`, async (ctx) => {
      const doc = find(col, ctx.params.id);
      if (!doc) throw new MockHttpError(404, `${o.label} not found`);
      await canRead(ctx, doc);
      return doc;
    });
    router.register('POST', o.path, async (ctx) => {
      requireAdmin(await o.resolveActor(ctx));
      const body = (await ctx.json()) || {};
      if (o.key) {
        if (!body[o.key]) throw new MockHttpError(400, `"${o.key}" is required`);
        if (find(col, String(body[o.key]))) throw new MockHttpError(409, `${o.label} already exists`);
      }
      return col.insert(body);
    });
    router.register('PUT', `${o.path}/:id`, async (ctx) => {
      requireAdmin(await o.resolveActor(ctx));
      const doc = find(col, ctx.params.id);
      if (!doc) throw new MockHttpError(404, `${o.label} not found`);
      const { _id, ...changes } = (await ctx.json()) || {};
      return col.update(doc._id, changes);
    });
    router.register('DELETE', `${o.path}/:id`, async (ctx) => {
      requireAdmin(await o.resolveActor(ctx));
      const doc = find(col, ctx.params.id);
      if (!doc) throw new MockHttpError(404, `${o.label} not found`);
      col.remove(doc._id);
      return doc;
    });
  };
}

/** Blueprints (read for all, write for admins), blocks, components and configurations. */
export function contentRoutes({ resolveActor }: { resolveActor: ActorResolver }): RouteModule {
  const modules: RouteModule[] = [
    // `/api/blueprints/:bp/entities` has more segments, so there is no clash with the entities routes
    crud({ path: '/api/blueprints', collection: (s) => s.blueprints, key: 'identifier', label: 'blueprint', resolveActor }),
    crud({ path: '/api/blocks', collection: (s) => s.blocks, label: 'block', resolveActor }),
    crud({ path: '/api/components', collection: (s) => s.components, label: 'component', resolveActor }),
  ];
  return (router, state) => {
    const configs = state.configurations;
    const appConfig = () => configs.findOne((c) => c.key === 'app-configuration');

    // the app configuration is public; PUT merges `metadata` shallowly
    router.register('GET', '/api/configurations/app-configuration', () => appConfig() ?? { key: 'app-configuration', public: true, metadata: {} });
    router.register('PUT', '/api/configurations/app-configuration', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      const body = (await ctx.json()) || {};
      const current = appConfig();
      const metadata = { ...current?.metadata, ...body.metadata };
      return current
        ? configs.update(current._id, { metadata })
        : configs.insert({ key: 'app-configuration', public: true, metadata });
    });

    // other configurations: addressed by `key`; non-public ones are readable by admins only
    router.use(
      crud({
        path: '/api/configurations',
        collection: (s) => s.configurations,
        key: 'key',
        label: 'configuration',
        adminRead: true,
        readableByAll: (c) => !!c.public,
        resolveActor,
      }),
      state,
    );
    for (const module of modules) router.use(module, state);

    // list for non-admins only contains public configurations
    router.prepend('GET', '/api/configurations', async (ctx) => {
      const actor = await resolveActor(ctx);
      const all = configs.list();
      return !actor || actor.roles.includes('admin') ? all : all.filter((c) => c.public);
    });
  };
}
