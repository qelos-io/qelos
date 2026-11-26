import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { isValidId } from '../state/ids.js';
import { mayAct, type ActorResolver } from './actor.js';

/**
 * `sdk.scripts` and the older `sdk.components` of the administrator SDK, following `apps/no-code`
 * (`controllers/scripts-api.ts`, `scripts.ts`, `components.ts`), for administrators and plugins. Nothing is compiled:
 * an invalid source is accepted, `requiredProps` stays empty and answers carry no `compiledContent`.
 */

type ItemType = 'script' | 'component';
type Item = Record<string, any>;

const EDITORS = ['plugin', 'admin'];
const IDENTIFIER = /^[\w@.-]+(\/[\w@.-]+)*$/;

const message = (text: string, status: number, reason?: string) => jsonResponse({ message: text, ...(reason ? { reason } : {}) }, status);
const defined = (item: Item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));

/** an explicit `type` wins; otherwise a `componentName` or a `.vue` identifier means a component */
const inferType = (item: Item | undefined): ItemType => {
  if (item?.type === 'component' || item?.type === 'script') return item.type;
  return item?.componentName || String(item?.identifier || '').endsWith('.vue') ? 'component' : 'script';
};
const normalize = (identifier: unknown) =>
  String(identifier || '')
    .trim()
    .replace(/^(\.\/)+/, '')
    .replace(/\.(m?[jt]sx?)$/, '');
const isValidIdentifier = (identifier: string) =>
  IDENTIFIER.test(identifier) && !identifier.split('/').some((part) => part === '.' || part === '..');

/** what an answer carries of a stored item */
const view = ({ compiledContent: _compiled, type: _type, ...item }: Doc) => item;
const summary = ({ content: _content, ...item }: Item) => item;
const typed = (item: Item, type: ItemType) => ({ ...item, type });

export function scriptRoutes({ resolveActor }: { resolveActor: ActorResolver }) {
  return (router: Router, state: MockState) => {
    const now = () => new Date().toISOString();
    const document = (fields: Item) => ({ ...defined(fields), tenant: state.settings.tenantId, created: now(), updated: now(), __v: 0 });

    /** scripts are the `scripts` collection, and the scripts `qelos pull` writes among the components */
    const holders = (type: ItemType) =>
      type === 'script'
        ? [
            { collection: state.scripts, has: () => true },
            { collection: state.components, has: (doc: Doc) => doc.type === 'script' },
          ]
        : [{ collection: state.components, has: (doc: Doc) => doc.type !== 'script' }];
    const list = (type: ItemType) => holders(type).flatMap(({ collection, has }) => collection.list(has));
    const find = (type: ItemType, id: string) => list(type).find((doc) => doc._id === id);
    const holding = (type: ItemType, id: string) => holders(type).find(({ collection }) => collection.get(id))!.collection;
    const named = (type: ItemType, identifier: unknown, except?: string) =>
      list(type).find((doc) => doc.identifier === identifier && doc._id !== except);
    const create = (type: ItemType, fields: Item) =>
      (type === 'script' ? state.scripts : state.components).insert(document(fields) as Item);
    const change = (type: ItemType, id: string, changes: Item) =>
      holding(type, id).update(id, { ...defined(changes), updated: now() })!;

    // ---------------------------------------------------------------- one item
    function createItem(type: ItemType, body: Item): Response | Doc {
      const { description, content, componentName } = body;
      if (type === 'script') {
        const identifier = normalize(body.identifier);
        if (!isValidIdentifier(identifier) || typeof content !== 'string') {
          return message('invalid script', 400, 'identifier and content are required');
        }
        const taken = named(type, identifier);
        if (!content || taken) return message('failed to create a script', 400, taken && content ? 'script identifier already exists' : 'unknown error');
        return create(type, { identifier, description, content });
      }
      if (typeof content !== 'string' || !content) return message('failed to compile a component', 400, 'Compilation failed');
      const { identifier } = body;
      if (!identifier || !componentName) return message('failed to create a component', 400, 'unknown error');
      if (named(type, identifier)) return message('failed to create a component', 400, 'component identifier already exists');
      return create(type, { identifier, componentName, description, content, requiredProps: [] });
    }

    function updateItem(type: ItemType, current: Doc, body: Item): Response | Doc {
      const { description, content, componentName } = body;
      const identifier = body.identifier ? (type === 'script' ? normalize(body.identifier) : body.identifier) : undefined;
      if (type === 'script' && body.identifier && !isValidIdentifier(identifier)) return message('invalid script', 400, 'invalid identifier');
      if (identifier && named(type, identifier, current._id)) {
        return message(`failed to update a ${type}`, 400, `${type} identifier already exists`);
      }
      return change(type, current._id, {
        identifier,
        description: description || undefined,
        content: content || undefined,
        ...(type === 'component' ? { componentName: componentName || undefined } : {}),
      });
    }

    // ---------------------------------------------------------------- bulk
    function upsertScripts(items: Item[]) {
      return items.map((item) => {
        const identifier = normalize(item?.identifier);
        if (!isValidIdentifier(identifier) || typeof item.content !== 'string') {
          return { identifier: item?.identifier, success: false, error: 'invalid identifier or content' };
        }
        const changes = { description: item.description || undefined, content: item.content };
        const current = named('script', identifier);
        const script = current ? change('script', current._id, changes) : create('script', { identifier, ...changes });
        return { identifier, success: true, script: view(script) };
      });
    }

    /** undefined when the service would fail the whole request */
    function upsertComponents(items: Item[]) {
      // like the service: items are matched against what was stored before the request
      const before = list('component').map((doc) => ({ ...doc }));
      const match = (item: Item) => before.find((doc) => doc.identifier === item?.identifier || doc.componentName === item?.componentName);
      if (items.some((item) => match(item) && typeof item.content !== 'string')) return undefined;
      return items.map((item) => {
        const { identifier, componentName, description, content } = item ?? {};
        const failed = (error: string) => ({ identifier, success: false, error });
        const existing = match(item);
        const unchanged = existing && content.trim() === existing.content?.trim() && identifier === existing.identifier;
        if (!unchanged && (typeof content !== 'string' || !content)) return failed('Compilation failed');
        if (!existing) {
          const missing = [['identifier', identifier], ['componentName', componentName]].find(([, value]) => !value)?.[0];
          if (missing) return failed(`Component validation failed: ${missing}: Path \`${missing}\` is required.`);
        }
        if (identifier && named('component', identifier, existing?._id)) return failed('component identifier already exists');
        const fields = {
          identifier: identifier || undefined,
          componentName: componentName || undefined,
          description: description || undefined,
          ...(unchanged ? {} : { content, requiredProps: [] }),
        };
        const component = existing ? change('component', existing._id, fields) : create('component', fields);
        return { identifier, success: true, component: view(component) };
      });
    }

    const report = (results: Array<{ success: boolean }>) => {
      const succeeded = results.filter((result) => result.success).length;
      return { total: results.length, succeeded, failed: results.length - succeeded, results };
    };

    // ---------------------------------------------------------------- routes
    const route = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      handler: (ctx: RouteContext, body: Item) => unknown,
    ) =>
      router.register(method, path, async (ctx) => {
        if (!mayAct(await resolveActor(ctx), EDITORS)) return new Response(null, { status: 401 });
        return handler(ctx, (await ctx.json()) ?? {});
      });

    route('GET', '/api/scripts', ({ query }) => {
      const wanted = query.get('type');
      const of = (type: ItemType) => list(type).map((doc) => typed(summary(view(doc)), type));
      return [...(wanted === 'component' ? [] : of('script')), ...(wanted === 'script' ? [] : of('component'))];
    });

    route('POST', '/api/scripts/bulk', (_ctx, { items = [], scripts = [], components = [] }) => {
      const required = () => message('items array is required', 400);
      if (![items, scripts, components].every(Array.isArray)) return required();
      const all: Item[] = [
        ...items,
        ...scripts.map((item: Item) => ({ ...item, type: 'script' })),
        ...components.map((item: Item) => ({ ...item, type: 'component' })),
      ];
      if (!all.length) return required();
      // scripts first, so components of the same request may import them
      const scriptResults = upsertScripts(all.filter((item) => inferType(item) === 'script'));
      const componentResults = upsertComponents(all.filter((item) => inferType(item) === 'component'));
      if (!componentResults) return message('failed to bulk create/update', 500);
      return report([
        ...scriptResults.map((result) => ({ ...result, type: 'script' })),
        ...componentResults.map((result) => ({ ...result, type: 'component' })),
      ]);
    });

    route('POST', '/api/scripts', (_ctx, body) => {
      const type = inferType(body);
      const created = createItem(type, body);
      return created instanceof Response ? created : typed(view(created), type);
    });

    /** a script or component by the id of the request */
    const item = (handler: (type: ItemType, doc: Doc, body: Item) => unknown) => ({ params }: RouteContext, body: Item) => {
      for (const type of ['script', 'component'] as const) {
        const doc = find(type, params.id);
        if (doc) return handler(type, doc, body);
      }
      return message('not found', 404);
    };
    route('GET', '/api/scripts/:id', item((type, doc) => typed(view(doc), type)));
    route('PUT', '/api/scripts/:id', item((type, doc, body) => {
      const updated = updateItem(type, doc, body);
      return updated instanceof Response ? updated : typed(view(updated), type);
    }));
    route('DELETE', '/api/scripts/:id', item((type, doc) => {
      holding(type, doc._id).remove(doc._id);
      return typed(view(doc), type);
    }));

    // ---------------------------------------------------------------- the older components API
    route('GET', '/api/components', () => list('component').map((doc) => summary(view(doc))));

    route('POST', '/api/components/bulk', (_ctx, { components }) => {
      if (!Array.isArray(components) || !components.length) return message('components array is required', 400);
      const results = upsertComponents(components);
      return results ? report(results) : message('failed to bulk create/update components', 500);
    });

    route('POST', '/api/components', (_ctx, body) => {
      const created = createItem('component', body);
      return created instanceof Response ? created : view(created);
    });

    /** an unknown component answers `null`, an id the database cannot read fails with `failure` */
    const component = (failure: string, handler: (doc: Doc, body: Item) => unknown) => ({ params }: RouteContext, body: Item) => {
      const doc = find('component', params.id);
      if (doc) return handler(doc, body);
      if (!isValidId(params.id)) return message(failure, 400);
      return body.content ? message('component not found', 404) : jsonResponse(null);
    };
    route('GET', '/api/components/:id', component('failed to get a component', view));
    route('PUT', '/api/components/:id', component('failed to update a component', (doc, body) => {
      const updated = updateItem('component', doc, body);
      return updated instanceof Response ? updated : view(updated);
    }));
    route('DELETE', '/api/components/:id', component('failed to remove a component', (doc) => {
      state.components.remove(doc._id);
      return view(doc);
    }));
  };
}
