import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { mayAct, type ActorResolver } from './actor.js';
import { generateId, isValidId } from '../state/ids.js';

/**
 * `sdk.ai.rag`: the vector storage routes of `apps/ai` (`controllers/storage-management.ts`), for administrators.
 * No model provider is called: stores and their files are kept in `mock.state.collection('vectorStores')`.
 */

const SCOPES = ['thread', 'user', 'workspace', 'tenant'];

export function ragRoutes({ resolveActor }: { resolveActor: ActorResolver }) {
  return (router: Router, state: MockState) => {
    const stores = () => state.collection('vectorStores');
    const error = (text: string, status: number) => jsonResponse({ error: text }, status);

    const route = (path: string, handler: (body: Record<string, any>, ctx: RouteContext) => unknown) =>
      router.register('POST', `/api/ai/sources/:sourceId/storage${path}`, async (ctx) => {
        if (!mayAct(await resolveActor(ctx), ['admin'])) return new Response(null, { status: 401 });
        return handler((await ctx.json()) ?? {}, ctx);
      });

    function createStore(data: Record<string, unknown>): Doc {
      return stores().insert({
        externalId: `vs_mock_${generateId()}`,
        files: [],
        tenant: state.settings.tenantId,
        created: new Date().toISOString(),
        ...data,
      });
    }

    /** the store given, else the integration's own one, created on first use */
    function storeOf(body: Record<string, any>, sourceId: string): Doc | { externalId: string } {
      const given = body.vectorStoreId as string | undefined;
      if (given) return stores().findOne((s) => s.externalId === given) ?? { externalId: given };
      const { integrationId } = body;
      return (
        stores().findOne((s) => s.integration === integrationId) ??
        createStore({ sourceId, integration: integrationId })
      );
    }

    route('', (body, ctx) => {
      const { integrationId, scope, subjectId, expirationAfterDays } = body;
      if (subjectId !== undefined && typeof subjectId !== 'string') {
        return jsonResponse({ error: 'Invalid subjectId: must be a string', received: typeof subjectId }, 400);
      }
      if (!integrationId) return error('Integration ID (agent) is required', 400);
      if (!scope) return error('Scope is required', 400);
      if (!SCOPES.includes(scope)) return error('Invalid scope. Must be one of: thread, user, workspace, tenant', 400);
      if (scope !== 'tenant' && !subjectId) return error('Subject ID is required for scope other than tenant', 400);
      if (subjectId && !isValidId(subjectId)) {
        return jsonResponse({ error: 'Failed to create vector storage', details: 'invalid subjectId' }, 500);
      }
      // one store per agent, scope and subject
      const store =
        stores().findOne((s) => s.agent === integrationId && s.scope === scope && s.subjectId === subjectId) ??
        createStore({ sourceId: ctx.params.sourceId, agent: integrationId, scope, subjectId, expirationAfterDays });
      return {
        success: true,
        message: 'Vector storage created successfully',
        vectorStore: {
          id: store._id,
          scope: store.scope,
          subjectId: store.subjectId,
          tenant: store.tenant,
          agent: store.agent,
          externalId: store.externalId,
          expirationAfterDays: store.expirationAfterDays,
          created: store.created,
        },
      };
    });

    route('/upload', (body, ctx) => {
      const { content } = body;
      if (!content) return error('Content is required', 400);
      if (typeof content !== 'string' && typeof content !== 'object') {
        return jsonResponse({ error: 'Content must be a string or object', received: typeof content }, 400);
      }
      if (!body.integrationId) return error('Integration ID is required', 400);
      const store = storeOf(body, ctx.params.sourceId);
      const fileId = `file_mock_${generateId()}`;
      if ('_id' in store) {
        const extension = typeof content === 'string' ? 'txt' : 'json';
        const file = {
          id: fileId,
          fileName: body.fileName || `content-${fileId}.${extension}`,
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          metadata: body.metadata,
        };
        stores().update(store._id, { files: [...(store.files ?? []), file] });
      }
      return { success: true, message: 'Content uploaded successfully', fileId, vectorStoreId: store.externalId };
    });

    route('/clear', (body, ctx) => {
      if (!body.integrationId) return error('Integration ID is required', 400);
      const store = storeOf(body, ctx.params.sourceId);
      let clearedCount = 0;
      if ('_id' in store) {
        const wanted: string[] | undefined = body.fileIds?.length ? body.fileIds : undefined;
        const files: Doc[] = (store.files ?? []) as any;
        const kept = wanted ? files.filter((f: any) => !wanted.includes(f.id)) : [];
        clearedCount = files.length - kept.length;
        stores().update(store._id, { files: kept });
      }
      return { success: true, message: 'Files cleared successfully', clearedCount, vectorStoreId: store.externalId };
    });
  };
}
