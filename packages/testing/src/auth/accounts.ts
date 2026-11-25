import type { Doc, MockState } from '../state/mock-state.js';
import { hashPassword } from './passwords.js';
import type { WorkspaceClaim } from './tokens.js';

export const PRIVILEGED_ROLES = ['admin'];

const lower = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export function isPrivilegedUser(user: Doc): boolean {
  return (user.roles || []).some((r: string) => PRIVILEGED_ROLES.includes(r));
}

// ---------------------------------------------------------------- users

function splitName(fullName: string): [string, string] {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  return [first, rest.join(' ')];
}

/** Fill the fields the real auth service guarantees on every user. Idempotent. */
function normalizeUser(state: MockState, user: Doc) {
  const patch: Record<string, unknown> = {};
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : undefined;
  if (email && email !== user.email) patch.email = email;
  if (!user.username) patch.username = email || String(user._id);
  const fullName = user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
  if (fullName) {
    if (!user.fullName) patch.fullName = fullName;
    if (!user.name) patch.name = fullName;
    if (!user.firstName) [patch.firstName, patch.lastName] = splitName(fullName);
  }
  if (!Array.isArray(user.roles) || !user.roles.length) patch.roles = [state.settings.auth.defaultRole];
  if (!user.metadata) patch.metadata = {};
  if (!user.tenant) patch.tenant = state.settings.tenantId;
  if (!user.created) patch.created = new Date().toISOString();
  if (typeof user.password === 'string') {
    patch.passwordHash = hashPassword(user.password);
    patch.password = undefined;
  }
  if (Object.keys(patch).length) {
    state.users.update(user._id, patch);
    if ('password' in patch) delete user.password;
  }
}

function seedPersonaWorkspaces(state: MockState, persona: Doc, user: Doc) {
  for (const entry of persona.workspaces || []) {
    let ws = entry._id
      ? state.workspaces.get(entry._id)
      : entry.name
        ? state.workspaces.findOne((w) => w.name === entry.name)
        : undefined;
    if (!ws) {
      ws = state.workspaces.insert(
        newWorkspaceDoc(state, { _id: entry._id, name: entry.name || 'Workspace', labels: entry.labels }),
      );
    }
    if (!ws.members.some((m: Doc) => m.user === user._id)) {
      addMember(state, ws, user._id, entry.roles?.length ? [...entry.roles] : ['member', 'user']);
    }
  }
}

const seededAt = new WeakMap<MockState, number>();

/**
 * Normalize seeded users/personas (hash passwords, derive names, create persona
 * workspaces + memberships). Idempotent; runs again after `state.reset()`.
 */
export function ensureAuthSeeded(state: MockState) {
  if (seededAt.get(state) === state.resetCount) return;
  seededAt.set(state, state.resetCount);
  for (const user of state.users.list()) normalizeUser(state, user);
  for (const persona of state.personas.list((p) => !p.workspacesSeeded)) {
    const user = state.users.get(persona._id) || state.users.findOne((u) => u.email === lower(persona.email));
    if (user && persona.workspaces?.length) seedPersonaWorkspaces(state, persona, user);
    state.personas.update(persona._id, { workspacesSeeded: true });
  }
  // persona-only fields do not belong to the user document
  for (const user of state.users.list((u) => 'workspaces' in u)) {
    delete user.workspaces;
    state.users.update(user._id, {});
  }
}

export function findUserByLogin(state: MockState, login: string): Doc | undefined {
  const key = lower(login);
  if (!key) return undefined;
  return state.users.findOne((u) => lower(u.username) === key || lower(u.email) === key);
}

/** Find a user by id, email or username (persona header/cookie/default values). */
export function findUserByRef(state: MockState, ref: string): Doc | undefined {
  return state.users.get(ref) || findUserByLogin(state, ref);
}

export const userSummary = (u: Doc) => ({
  username: u.username,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  name: u.name || u.fullName,
  roles: u.roles,
});

/** Shape of `GET /api/me`. */
export function meResponse(state: MockState, user: Doc, workspace: WorkspaceClaim | null) {
  return {
    _id: user._id,
    tenant: user.tenant ?? state.settings.tenantId,
    username: user.username,
    email: user.email,
    phone: user.phone,
    name: user.name || user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    profileImage: user.profileImage,
    birthDate: user.birthDate,
    roles: user.roles,
    metadata: user.metadata || {},
    workspace,
  };
}

// ----------------------------------------------------------- workspaces

export function newWorkspaceDoc(state: MockState, data: Record<string, any>) {
  const now = new Date().toISOString();
  return {
    ...(data._id ? { _id: data._id } : {}),
    tenant: state.settings.tenantId,
    name: data.name,
    logo: data.logo,
    labels: Array.isArray(data.labels) ? data.labels : [],
    members: Array.isArray(data.members) ? data.members : [],
    invites: Array.isArray(data.invites) ? data.invites : [],
    created: now,
    updated: now,
  } as Omit<Doc, '_id'> & { _id?: string };
}

export function addMember(state: MockState, ws: Doc, userId: string, roles: string[]) {
  const members = [...ws.members, { user: userId, roles, created: new Date().toISOString() }];
  state.workspaces.update(ws._id, { members, updated: new Date().toISOString() });
}

export const findMember = (ws: Doc, userId: string): Doc | undefined => ws.members?.find((m: Doc) => m.user === userId);

export function claimFor(ws: Doc | undefined, userId: string): WorkspaceClaim | null {
  const member = ws && findMember(ws, userId);
  if (!ws || !member) return null;
  return { _id: ws._id, name: ws.name, roles: member.roles, labels: ws.labels || [] };
}

/**
 * Pick the workspace a fresh session starts in: the preferred one, the user's
 * last active one, then the first workspace the user belongs to.
 */
export function pickWorkspace(state: MockState, user: Doc, preferredId?: string): WorkspaceClaim | null {
  for (const id of [preferredId, user.activeWorkspace]) {
    const claim = id ? claimFor(state.workspaces.get(id), user._id) : null;
    if (claim) return claim;
  }
  const first = state.workspaces.findOne((w) => !!findMember(w, user._id));
  return claimFor(first, user._id);
}

export function createPersonalWorkspace(state: MockState, user: Doc): Doc {
  return state.workspaces.insert(
    newWorkspaceDoc(state, {
      name: `${user.firstName || user.username}'s workspace`,
      members: [{ user: user._id, roles: ['admin', 'user'], created: new Date().toISOString() }],
    }),
  );
}
