/** The values edited on the user page, what is wrong with them, and what is sent to save them. */

export interface UserDraft {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  roles: string[];
  profileImage: string;
  /** JSON text */
  internalMetadata: string;
}

export type UserMode = 'create' | 'edit' | 'self';

export type UserSection = 'profile' | 'access' | 'billing' | 'advanced';

export type UserErrors = Partial<Record<'firstName' | 'lastName' | 'username' | 'password' | 'roles' | 'internalMetadata', string>>;

const decode = (value?: string | null) => {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    return value ?? '';
  }
};

export function draftFromUser(user?: Partial<{ firstName: string; lastName: string; username: string; roles: string[]; profileImage: string; internalMetadata: unknown }>): UserDraft {
  const metadata = user?.internalMetadata;
  return {
    firstName: decode(user?.firstName),
    lastName: decode(user?.lastName),
    username: user?.username || '',
    password: '',
    roles: user ? [...(user.roles || [])] : ['user'],
    profileImage: user?.profileImage || '',
    internalMetadata: metadata && typeof metadata === 'object' ? JSON.stringify(metadata, null, 2) : typeof metadata === 'string' && metadata ? metadata : '{}',
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUser(draft: UserDraft, mode: UserMode): UserErrors {
  const errors: UserErrors = {};
  const first = draft.firstName.trim();
  const last = draft.lastName.trim();
  if (!first) errors.firstName = 'First name is required';
  else if (first.length < 2 || first.length > 50) errors.firstName = 'Length should be 2 to 50 characters';
  if (!last) errors.lastName = 'Last name is required';
  else if (last.length < 2 || last.length > 50) errors.lastName = 'Length should be 2 to 50 characters';
  if (mode !== 'self') {
    if (!draft.username.trim()) errors.username = 'Email is required';
    else if (!EMAIL.test(draft.username.trim())) errors.username = 'Please enter a valid email address';
  }
  if (mode === 'create' && !draft.password) errors.password = 'Password is required';
  else if (draft.password && draft.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (mode !== 'self' && !draft.roles.length) errors.roles = 'Give the user at least one role';
  if (mode !== 'self') {
    try {
      const parsed = JSON.parse(draft.internalMetadata || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) errors.internalMetadata = 'Error in metadata format. Please check the JSON syntax.';
    } catch {
      errors.internalMetadata = 'Error in metadata format. Please check the JSON syntax.';
    }
  }
  return errors;
}

/** where each error lives, so saving can take you to the first one */
export const SECTION_OF: Record<keyof UserErrors, UserSection> = {
  firstName: 'profile',
  lastName: 'profile',
  username: 'profile',
  password: 'access',
  roles: 'access',
  internalMetadata: 'advanced',
};

export function firstErrorSection(errors: UserErrors, order: UserSection[] = ['profile', 'access', 'advanced']): UserSection | undefined {
  const sections = new Set((Object.keys(errors) as Array<keyof UserErrors>).map((key) => SECTION_OF[key]));
  return order.find((section) => sections.has(section));
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((item, i) => item === b[i]);

/** What to send: everything filled in for a new user, only what changed for an existing one. */
export function buildPayload(draft: UserDraft, baseline: UserDraft | undefined, mode: UserMode): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const changed = <K extends keyof UserDraft>(key: K) => mode === 'create' || !baseline || draft[key] !== baseline[key];
  if (changed('firstName')) payload.firstName = draft.firstName.trim();
  if (changed('lastName')) payload.lastName = draft.lastName.trim();
  if (mode !== 'self' && changed('username')) payload.username = draft.username.trim();
  if (draft.password) payload.password = draft.password;
  if (mode !== 'self' && (mode === 'create' || !baseline || !sameList(draft.roles, baseline.roles))) payload.roles = draft.roles;
  if (changed('profileImage') && (draft.profileImage || mode !== 'create')) payload.profileImage = draft.profileImage;
  if (mode !== 'self' && changed('internalMetadata')) payload.internalMetadata = JSON.parse(draft.internalMetadata || '{}');
  if (mode === 'create') Object.keys(payload).forEach((key) => (payload[key] === '' ? delete payload[key] : undefined));
  return payload;
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** a readable random password (no look-alike characters) */
export function generatePassword(length = 16, random: (max: number) => number = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max): string {
  return Array.from({ length }, () => PASSWORD_CHARS[random(PASSWORD_CHARS.length)]).join('');
}
