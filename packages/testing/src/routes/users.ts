import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate } from '../auth/authenticate.js';
import { isPrivilegedUser } from '../auth/accounts.js';
import { hashPassword } from '../auth/passwords.js';
import { isValidId } from '../state/ids.js';

/**
 * Admin user management (`sdk.users` of the administrator SDK), following `apps/auth/server/controllers/users.ts`:
 * privileged callers only (401 otherwise), the same selected fields, status codes and messages.
 */

/** What the service returns for a user. `email` is not part of it. */
const SELECTED_FIELDS = [
  'username',
  'phone',
  'fullName',
  'firstName',
  'lastName',
  'birthDate',
  'roles',
  'profileImage',
  'socialLogins',
  'emailVerified',
  'lastLogin',
  'metadata',
];

/** Fields an administrator can set when creating a user; anything else is dropped, as by the database schema. */
const CREATE_FIELDS = ['username', 'email', 'phone', 'password', 'fullName', 'firstName', 'lastName', 'birthDate', 'profileImage', 'emailVerified', 'socialLogins'];

const pick = (doc: Record<string, any>, fields: string[]) =>
  Object.fromEntries([['_id', doc._id], ...fields.filter((f) => doc[f] !== undefined).map((f) => [f, doc[f]])]);

function authConfig(state: MockState): { treatUsernameAs: string; additionalUserFields: Doc[] } {
  const stored = state.collection('configurations').findOne((c) => c.key === 'auth-configuration')?.metadata;
  return { treatUsernameAs: stored?.treatUsernameAs ?? 'email', additionalUserFields: stored?.additionalUserFields ?? [] };
}

/** Only the metadata fields the tenant configured are kept; a missing required one throws. */
function validMetadata(metadata: Record<string, any>, fields: Doc[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (metadata[field.key] !== undefined && typeof metadata[field.key] === field.valueType) result[field.key] = metadata[field.key];
    else if (field.defaultValue) result[field.key] = field.defaultValue;
    else if (field.required) throw new Error('INVALID_METADATA');
  }
  return result;
}

export function userRoutes(router: Router, state: MockState) {
  const denied = (ctx: RouteContext): Response | null => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return jsonResponse({ message: 'you are not authorized. must be logged in.' }, 401);
    if (!isPrivilegedUser(auth.user)) return jsonResponse({ message: 'you are not privileged.' }, 401);
    return null;
  };

  /** route handler for privileged callers */
  const admin = (handler: (ctx: RouteContext) => unknown) => async (ctx: RouteContext) => denied(ctx) ?? (await handler(ctx));

  const usernameTaken = (username: string, except?: string) =>
    !!state.users.findOne((u) => u.username === username && u._id !== except);

  router.register('GET', '/api/users', admin((ctx) => {
    const q = ctx.query;
    const ids = (q.get('users') ?? '').split(',').map((v) => v.trim()).filter(isValidId);
    if (q.get('users')) return ids.length ? state.users.list((u) => ids.includes(u._id)).map((u) => pick(u, SELECTED_FIELDS)) : [];

    let username: RegExp | undefined;
    const wanted = q.get('username')?.toLowerCase().trim().replace(/ /g, '+');
    try {
      if (wanted) username = new RegExp(wanted, 'i');
    } catch {
      return [];
    }
    const roles = q.get('roles')?.split(',').map((r) => r.trim());
    const only = q.get('_id')?.split(',').map((v) => v.trim());
    const fields = q.get('select')?.split(',') ?? SELECTED_FIELDS;
    return state.users
      .list(
        (u) =>
          (!username || username.test(String(u.username ?? ''))) &&
          (!roles || (u.roles ?? []).some((r: string) => roles.includes(r))) &&
          (!only || only.includes(u._id)),
      )
      .map((u) => pick(u, fields));
  }));

  router.register('GET', '/api/users/stats', admin(() => ({ users: state.users.list().length, workspaces: state.workspaces.list().length })));

  router.register('GET', '/api/users/:userId', admin((ctx) => {
    const user = state.users.get(ctx.params.userId);
    if (!user) return jsonResponse({ message: 'user not exists' }, 404);
    return { ...pick(user, SELECTED_FIELDS), internalMetadata: user.internalMetadata ?? {} };
  }));

  router.register('POST', '/api/users', admin(async (ctx) => {
    const { tenant: _tenant, name, internalMetadata, metadata, roles, ...data } = (await ctx.json()) ?? {};
    const config = authConfig(state);
    const user: Record<string, any> = Object.fromEntries(Object.entries(data).filter(([k]) => CREATE_FIELDS.includes(k)));
    const failed = () => jsonResponse({ message: 'user creation failed' }, 400);

    if (config.treatUsernameAs === 'email') {
      if (!user.username || typeof user.username !== 'string') return jsonResponse({ message: 'username is required' }, 400);
      user.username = user.username.toLowerCase().trim().replace(/ /g, '+');
      if (!user.username.includes('@')) return jsonResponse({ message: 'username should be an email address' }, 400);
      user.email = user.username;
    }
    if (!user.username || (user.email && !String(user.email).includes('@')) || usernameTaken(user.username)) return failed();
    user.email ||= user.username.includes('@') ? user.username : `${user.username}@null`;
    user.roles = Array.isArray(roles) && roles.length ? roles : [state.settings.auth.defaultRole];
    if (!user.fullName && name) user.fullName = name;
    try {
      user.metadata = metadata ? validMetadata(metadata, config.additionalUserFields) : {};
    } catch {
      user.metadata = {};
    }
    const { password, ...stored } = user;
    const created = state.users.insert({
      ...stored,
      ...(password ? { passwordHash: hashPassword(String(password)) } : {}),
      internalMetadata: internalMetadata ?? {},
      tenant: state.settings.tenantId,
      created: new Date().toISOString(),
    });
    return {
      _id: created._id,
      name: created.fullName,
      firstName: created.firstName,
      lastName: created.lastName,
      birthDate: created.birthDate,
      username: created.username,
      roles: created.roles,
      internalMetadata,
    };
  }));

  router.register('PUT', '/api/users/:userId', admin(async (ctx) => {
    const body = (await ctx.json()) ?? {};
    const { username, roles, name, password, firstName, lastName, birthDate, profileImage, internalMetadata, metadata } = body;
    const fullName = body.fullName || name;
    const id = ctx.params.userId;
    const user = state.users.get(id);
    const failed = () => jsonResponse({ message: 'user update failed' }, 500);
    // the service loads the user (and fails without one) only when its credentials or roles change
    if (!user && (username || roles || password)) return failed();
    if (username && usernameTaken(username, id)) return failed();

    const config = authConfig(state);
    const patch: Record<string, any> = {};
    for (const [key, value] of Object.entries({ fullName, firstName, lastName, birthDate, roles })) if (value) patch[key] = value;
    if (username) {
      patch.username = username;
      if (config.treatUsernameAs === 'email') patch.email = username;
      if (config.treatUsernameAs === 'phone') patch.phone = username;
    }
    if (password) patch.passwordHash = hashPassword(String(password));
    if (typeof profileImage === 'string') patch.profileImage = profileImage || null;
    if (metadata) {
      try {
        patch.metadata = validMetadata(metadata, config.additionalUserFields);
      } catch {
        /* invalid metadata is ignored */
      }
    }
    let merged: Record<string, unknown> | undefined;
    if (internalMetadata) {
      merged = { ...(user?.internalMetadata ?? {}), ...internalMetadata };
      patch.internalMetadata = merged;
    }
    if (user) state.users.update(id, patch);
    return {
      username,
      name: fullName,
      fullName,
      firstName,
      lastName,
      birthDate,
      profileImage,
      roles,
      internalMetadata: merged,
      _id: id,
    };
  }));

  router.register('DELETE', '/api/users/:userId', admin((ctx) => {
    const id = ctx.params.userId;
    state.users.remove(id);
    // a persona of the same user must not keep signing requests in
    state.personas.remove(id);
    return { _id: id, tenant: state.settings.tenantId };
  }));

  // ---- encrypted data kept per user (and per `x-encrypted-id`)
  const dataKey = (ctx: RouteContext) => {
    const id = ctx.request.headers.get('x-encrypted-id');
    return `${ctx.params.userId}${id ? `-${id}` : ''}`;
  };
  const exists = (ctx: RouteContext) => !!state.users.get(ctx.params.userId);

  // like the service: `null` when there is no data, and also when there is no such user
  router.register('GET', '/api/users/:userId/encrypted', admin((ctx) =>
    jsonResponse(exists(ctx) ? (state.collection('encryptedData').get(dataKey(ctx))?.value ?? null) : null),
  ));

  router.register('POST', '/api/users/:userId/encrypted', admin(async (ctx) => {
    if (!exists(ctx)) return jsonResponse({ message: 'failed to set encrypted data for user' }, 400);
    const value = await ctx.json();
    const store = state.collection('encryptedData');
    const key = dataKey(ctx);
    if (store.get(key)) store.replace(key, { value });
    else store.insert({ _id: key, value });
    return {};
  }));
}
