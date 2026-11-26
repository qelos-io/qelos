import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate, isPrivilegedCaller, type AuthContext } from '../auth/authenticate.js';
import { workspaceRules } from '../auth/rules.js';
import {
  addMember,
  claimFor,
  findMember,
  newWorkspaceDoc,
} from '../auth/accounts.js';
import { buildSetCookie, cookieTokenName, issueToken } from '../auth/tokens.js';
import { generateId } from '../state/ids.js';

const unauthorized = () => jsonResponse({ message: 'you are not authorized. must be logged in.' }, 401);
const lower = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

function normalizeInvites(invites: any[], previous: Doc[] = []): Doc[] {
  return invites.map((invite) => {
    const existing = previous.find(
      (p) => (invite._id && p._id === String(invite._id)) || (!invite._id && lower(p.email) === lower(invite.email)),
    );
    return {
      ...existing,
      ...invite,
      _id: existing?._id || (invite._id ? String(invite._id) : generateId()),
      created: existing?.created || invite.created || new Date().toISOString(),
      roles: invite.roles?.length ? invite.roles : ['member'],
    };
  });
}

/** workspace routes (list/create/get/update/delete, members, activate) and invite responses */
export function workspaceRoutes(router: Router, state: MockState) {
  const touch = (ws: Doc, patch: Record<string, unknown>) =>
    state.workspaces.update(ws._id, { ...patch, updated: new Date().toISOString() })!;

  /** member-visible shape: only the caller's own member entry (`members.$`) */
  const memberView = (ws: Doc, userId: string) => ({
    ...ws,
    members: ws.members.filter((m: Doc) => m.user === userId),
    invites: undefined,
  });

  interface Loaded {
    auth: AuthContext;
    ws: Doc;
    /** global privileged user, or workspace admin */
    isWsAdmin: boolean;
  }

  /** authenticate + `getWorkspaceByParams` (+ optional `onlyWorkspacePrivileged`) */
  function load(ctx: RouteContext, requireWsAdmin = false, from = 'get-workspace'): Loaded | Response {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    const privileged = isPrivilegedCaller(auth);
    const ws = state.workspaces.get(ctx.params.workspaceId);
    if (!ws || (!privileged && !findMember(ws, auth.user._id))) {
      return jsonResponse({ message: 'workspace not found', from }, 404);
    }
    const isWsAdmin = privileged || !!findMember(ws, auth.user._id)?.roles.includes('admin');
    if (requireWsAdmin && !isWsAdmin) return jsonResponse({ message: 'not authorized' }, 403);
    return { auth, ws, isWsAdmin };
  }

  router.register('GET', '/api/workspaces', (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    return state.workspaces
      .list((w) => !!findMember(w, auth.user._id))
      .map((w) => {
        const member = findMember(w, auth.user._id)!;
        return {
          _id: w._id,
          name: w.name,
          logo: w.logo,
          tenant: w.tenant,
          labels: w.labels,
          members: [member],
          isPrivilegedUser: member.roles.includes('admin'),
        };
      });
  });

  router.register('GET', '/api/workspaces/all', ({ request, query }) => {
    const auth = authenticate(request, state);
    if (!auth) return unauthorized();
    if (!isPrivilegedCaller(auth)) return jsonResponse({ message: 'you are not privileged.' }, 401);
    const ids = query.get('_id')?.split(',');
    const member = query.get('members.user')?.split(',');
    const labels = query.get('labels')?.split(',');
    const name = query.get('name')?.toLowerCase();
    const q = query.get('q')?.toLowerCase();
    return state.workspaces
      .list(
        (w) =>
          (!ids || ids.includes(w._id)) &&
          (!member || w.members.some((m: Doc) => member.includes(m.user))) &&
          (!labels || labels.some((l) => w.labels.includes(l))) &&
          (!name || w.name.toLowerCase().includes(name)) &&
          (!q ||
            w.name.toLowerCase().includes(q) ||
            w.invites.some((i: Doc) => lower(i.email).includes(q) || lower(i.name).includes(q))),
      )
      .map(({ _id, name, logo, tenant, labels }) => ({ _id, name, logo, tenant, labels }));
  });

  router.register('POST', '/api/workspaces', async (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    const body = (await ctx.json()) || {};
    const { name, logo, invites = [], labels = [] } = body;
    const rules = workspaceRules(state);
    const creators: string[] = rules.creationPrivilegedRoles ?? [];
    if (creators.length && !creators.some((role) => role === '*' || auth.user.roles?.includes(role))) {
      return jsonResponse({ message: 'you are not permitted to create a workspace' }, 403);
    }
    if (!Array.isArray(labels)) {
      return jsonResponse({ message: 'please provide all mandatory properties (missing "labels").' }, 400);
    }
    if (!rules.allowNonLabeledWorkspaces) {
      if (!labels.length) return jsonResponse({ message: 'please provide labels with valid values.' }, 400);
      if (!rules.labels?.some((option: Doc) => option.value?.length === labels.length)) {
        return jsonResponse({ message: 'provided labels does not match available options.' }, 400);
      }
    }
    if (!name) return jsonResponse({ message: 'failed to create workspace' }, 500);
    const ws = state.workspaces.insert(
      newWorkspaceDoc(state, {
        name,
        logo,
        labels,
        invites: normalizeInvites(invites),
        members:
          isPrivilegedCaller(auth) && Array.isArray(body.members) && body.members.length
            ? body.members
            : [{ user: auth.user._id, roles: ['admin', 'user'], created: new Date().toISOString() }],
      }),
    );
    return ws;
  });

  router.register('GET', '/api/workspaces/:workspaceId', (ctx) => {
    const loaded = load(ctx);
    if (loaded instanceof Response) return loaded;
    return loaded.isWsAdmin ? loaded.ws : memberView(loaded.ws, loaded.auth.user._id);
  });

  router.register('PUT', '/api/workspaces/:workspaceId', async (ctx) => {
    const loaded = load(ctx, true);
    if (loaded instanceof Response) return loaded;
    const { ws, auth } = loaded;
    const { name, logo, invites, members, labels } = (await ctx.json()) || {};
    const patch: Record<string, unknown> = {};
    if (name) patch.name = name;
    if (typeof logo === 'string') patch.logo = logo;
    if (invites) patch.invites = normalizeInvites(invites, ws.invites);
    if (isPrivilegedCaller(auth)) {
      if (members) {
        if (!Array.isArray(members)) return jsonResponse({ message: 'Invalid data. Must be an array.' }, 400);
        if (!members.length) return jsonResponse({ message: 'Members cannot be empty.' }, 400);
        patch.members = members;
      }
      if (labels) {
        if (!Array.isArray(labels)) return jsonResponse({ message: 'Invalid data. Must be an array.' }, 400);
        patch.labels = labels;
      }
    }
    return touch(ws, patch);
  });

  router.register('DELETE', '/api/workspaces/:workspaceId', (ctx) => {
    const loaded = load(ctx, true);
    if (loaded instanceof Response) return loaded;
    if (loaded.auth.workspace?._id === loaded.ws._id) {
      return jsonResponse({ message: 'You cannot remove your active workspace.' }, 400);
    }
    state.workspaces.remove(loaded.ws._id);
    return loaded.ws;
  });

  router.register('GET', '/api/workspaces/:workspaceId/members', (ctx) => {
    const loaded = load(ctx, true, 'get-members');
    if (loaded instanceof Response) return loaded;
    return loaded.ws.members.flatMap((member: Doc) => {
      const user = state.users.get(member.user);
      return user
        ? [
            {
              _id: user._id,
              email: user.email,
              fullName: user.fullName,
              firstName: user.firstName,
              lastName: user.lastName,
              user: member.user,
              roles: member.roles,
              created: member.created,
            },
          ]
        : [];
    });
  });

  router.register('POST', '/api/workspaces/:workspaceId/members', async (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    if (!isPrivilegedCaller(auth)) return jsonResponse({ message: 'you are not privileged.' }, 401);
    const { userId, roles } = (await ctx.json()) || {};
    if (!userId || !Array.isArray(roles)) {
      return jsonResponse({ message: 'Invalid input. Provide "userId", "roles".' }, 400);
    }
    const user = state.users.get(userId);
    if (!user) return jsonResponse({ message: 'User not found.' }, 404);
    const ws = state.workspaces.get(ctx.params.workspaceId);
    if (!ws) return jsonResponse({ message: 'Workspace not found.' }, 404);
    if (findMember(ws, user._id)) return jsonResponse({ message: 'User is already a member of the workspace.' }, 400);
    addMember(state, ws, user._id, roles);
    return { message: 'Member added successfully.', workspace: state.workspaces.get(ws._id) };
  });

  router.register('PUT', '/api/workspaces/:workspaceId/members/:userId', async (ctx) => {
    const loaded = load(ctx, true);
    if (loaded instanceof Response) return loaded;
    const { roles } = (await ctx.json()) || {};
    if (!Array.isArray(roles)) return jsonResponse({ message: 'Invalid input. "roles" must be an array.' }, 400);
    const member = findMember(loaded.ws, ctx.params.userId);
    if (!member) return jsonResponse({ message: 'Member not found in the workspace.' }, 404);
    const updatedMember = { ...member, roles: [...roles] };
    touch(loaded.ws, { members: loaded.ws.members.map((m: Doc) => (m === member ? updatedMember : m)) });
    return { message: 'Member roles updated successfully.', updatedMember, workspaceId: loaded.ws._id };
  });

  router.register('DELETE', '/api/workspaces/:workspaceId/members/:userId', (ctx) => {
    const loaded = load(ctx, true);
    if (loaded instanceof Response) return loaded;
    const { userId } = ctx.params;
    if (!findMember(loaded.ws, userId)) return jsonResponse({ message: 'Workspace not found.' }, 404);
    touch(loaded.ws, { members: loaded.ws.members.filter((m: Doc) => m.user !== userId) });
    return { message: 'Member removed from workspace.', removedMemberId: userId, userId };
  });

  /** select the active workspace; cookie sessions get a rotated cookie like the real service */
  router.register('POST', '/api/workspaces/:workspaceId/activate', (ctx) => {
    const loaded = load(ctx);
    if (loaded instanceof Response) return loaded;
    const { auth, ws } = loaded;
    const claim = claimFor(ws, auth.user._id);
    // an impersonating administrator changes nobody's session
    if (auth.impersonator) return memberView(ws, auth.user._id);
    if (!claim) return jsonResponse({ message: 'workspace not found', from: 'get-workspace' }, 404);
    state.users.update(auth.user._id, { activeWorkspace: ws._id });
    const body = JSON.stringify(memberView(ws, auth.user._id));
    const headers = new Headers({ 'content-type': 'application/json' });
    const { session } = auth;
    if (session.kind === 'cookie') {
      state.sessions.remove(session._id);
      const fresh = issueToken(state, auth.user, 'cookie', claim);
      headers.append('set-cookie', buildSetCookie(cookieTokenName(state), fresh.token, state.settings.auth.cookieTokenTtlMs));
    } else if (session.kind === 'access') {
      state.sessions.update(session._id, { workspaceId: ws._id });
    }
    return new Response(body, { headers });
  });

  // ---------------------------------------------------------------- encrypted data (administrators)
  function encrypted(ctx: RouteContext): { key: string; exists: boolean } | Response {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    if (!isPrivilegedCaller(auth)) return jsonResponse({ message: 'you are not privileged.' }, 401);
    const { workspaceId } = ctx.params;
    const extra = ctx.request.headers.get('x-encrypted-id');
    return { key: `workspace:${workspaceId}${extra ? `-${extra}` : ''}`, exists: !!state.workspaces.get(workspaceId) };
  }

  router.register('GET', '/api/workspaces/:workspaceId/encrypted', (ctx) => {
    const data = encrypted(ctx);
    if (data instanceof Response) return data;
    if (!data.exists) return jsonResponse({ message: 'workspace does not exist' }, 404);
    return jsonResponse(state.collection('encryptedData').get(data.key)?.value ?? null);
  });

  router.register('POST', '/api/workspaces/:workspaceId/encrypted', async (ctx) => {
    const data = encrypted(ctx);
    if (data instanceof Response) return data;
    if (!data.exists) return jsonResponse({ message: 'failed to set encrypted data for user' }, 400);
    const value = await ctx.json();
    const store = state.collection('encryptedData');
    if (store.get(data.key)) store.replace(data.key, { value });
    else store.insert({ _id: data.key, value });
    return {};
  });

  // ---------------------------------------------------------------- invites

  router.register('GET', '/api/invites', (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    const email = lower(auth.user.email);
    if (!email) return jsonResponse({ message: 'missing email or phone' }, 500);
    return state.workspaces
      .list((w) => w.invites.some((i: Doc) => lower(i.email) === email))
      .map(({ _id, name, logo }) => ({ _id, name, logo }));
  });

  router.register('POST', '/api/invites', async (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return unauthorized();
    const { workspace: workspaceId, kind = 'decline' } = (await ctx.json()) || {};
    if (!workspaceId) return jsonResponse({ message: 'missing workspaceId' }, 400);
    if (!['accept', 'decline'].includes(kind)) {
      return jsonResponse({ message: 'respond kind should be either "accept" or "decline"' }, 400);
    }
    const email = lower(auth.user.email);
    const ws = state.workspaces.get(workspaceId);
    if (!ws || !ws.invites.some((i: Doc) => lower(i.email) === email)) {
      return jsonResponse(
        { message: 'workspace not found', email: auth.user.email, workspaceId, from: 'invite-respond' },
        404,
      );
    }
    touch(ws, { invites: ws.invites.filter((i: Doc) => lower(i.email) !== email) });
    if (kind === 'accept' && !findMember(ws, auth.user._id)) {
      // the service gives these roles, whatever the invite names
      addMember(state, state.workspaces.get(ws._id)!, auth.user._id, ['member', 'user']);
    }
    return { success: true };
  });
}
