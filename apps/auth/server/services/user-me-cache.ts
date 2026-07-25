import { cookieTokenExpiration } from '../../config';
import { cacheManager } from './cache-manager';
import logger from './logger';

export interface IUserMeProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  profileImage?: string | null;
  birthDate?: string | Date;
  metadata?: Record<string, unknown>;
}

export interface IUserMePayload {
  sub: string;
  tenant: string;
  username?: string;
  email?: string;
  phone?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string | Date;
  profileImage?: string | null;
  roles?: string[];
}

const USER_ME_CACHE_TTL = Math.floor(cookieTokenExpiration / 1000);

export function userMeCacheKey(tenant: string, userId: string): string {
  return `user-me:${tenant}:${userId}`;
}

export function decodeIfNeeded(value?: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (encodeURIComponent(decoded) === value) {
      return decoded;
    }
  } catch {
    //
  }

  return value;
}

function resolveNameFields(
  cached: IUserMeProfile | null,
  payload: IUserMePayload
): Pick<IUserMeProfile, 'firstName' | 'lastName' | 'fullName' | 'name'> {
  const firstName = cached?.firstName ?? decodeIfNeeded(payload.firstName);
  const lastName = cached?.lastName ?? decodeIfNeeded(payload.lastName);
  const fullName =
    cached?.fullName ??
    decodeIfNeeded(payload.fullName) ??
    decodeIfNeeded(payload.name) ??
    [firstName, lastName].filter(Boolean).join(' ').trim();
  const name = cached?.name ?? fullName;

  return { firstName, lastName, fullName, name };
}

export function buildMeResponse(
  payload: IUserMePayload,
  cached: IUserMeProfile | null,
  metadata: Record<string, unknown>,
  workspace: unknown
) {
  const { firstName, lastName, fullName, name } = resolveNameFields(cached, payload);
  const profileImage =
    cached?.profileImage !== undefined ? cached.profileImage : payload.profileImage;
  const birthDate = cached?.birthDate ?? payload.birthDate;
  const resolvedMetadata =
    cached?.metadata !== undefined ? cached.metadata : metadata;

  return {
    _id: payload.sub,
    tenant: payload.tenant,
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
    name,
    firstName,
    lastName,
    fullName,
    profileImage,
    birthDate,
    roles: payload.roles,
    metadata: resolvedMetadata,
    workspace,
  };
}

export function profileFromUser(user: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImage?: string | null;
  birthDate?: string | Date;
  metadata?: Record<string, unknown>;
}): IUserMeProfile {
  const firstName = user.firstName;
  const lastName = user.lastName;
  const fullName =
    user.fullName || [firstName, lastName].filter(Boolean).join(' ').trim();
  const name = fullName;

  return {
    firstName,
    lastName,
    fullName,
    name,
    profileImage: user.profileImage,
    birthDate: user.birthDate,
    metadata: user.metadata ?? {},
  };
}

export function resolveMeMetadata(
  cached: IUserMeProfile | null,
  dbMetadata: Record<string, unknown>
): Record<string, unknown> {
  if (cached?.metadata !== undefined) {
    return cached.metadata;
  }
  return dbMetadata;
}

export function buildProfileUpdate(
  cached: IUserMeProfile | null,
  payload: IUserMePayload,
  update: {
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string | Date;
    profileImage?: string | null;
    metadata?: Record<string, unknown>;
  }
): IUserMeProfile {
  const base = resolveNameFields(cached, payload);
  const nextFullName = update.fullName || update.name || base.fullName;
  const nextFirstName = update.firstName ?? base.firstName;
  const nextLastName = update.lastName ?? base.lastName;
  const nextName = update.name || nextFullName || [nextFirstName, nextLastName].filter(Boolean).join(' ').trim();

  const profile: IUserMeProfile = {
    firstName: nextFirstName,
    lastName: nextLastName,
    fullName: nextFullName || nextName,
    name: nextName,
    birthDate: update.birthDate ?? cached?.birthDate ?? payload.birthDate,
  };

  if (typeof update.profileImage === 'string') {
    profile.profileImage = update.profileImage || null;
  } else if (cached?.profileImage !== undefined) {
    profile.profileImage = cached.profileImage;
  } else if (payload.profileImage !== undefined) {
    profile.profileImage = payload.profileImage;
  }

  if (update.metadata !== undefined) {
    profile.metadata = update.metadata;
  } else if (cached?.metadata !== undefined) {
    profile.metadata = cached.metadata;
  }

  return profile;
}

export async function getCachedUserMe(
  tenant: string,
  userId: string
): Promise<IUserMeProfile | null> {
  try {
    const cached = await cacheManager.getItem(userMeCacheKey(tenant, userId));
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as IUserMeProfile;
  } catch {
    return null;
  }
}

export async function setCachedUserMe(
  tenant: string,
  userId: string,
  profile: IUserMeProfile
): Promise<void> {
  try {
    await cacheManager.setItem(
      userMeCacheKey(tenant, userId),
      JSON.stringify(profile),
      { ttl: USER_ME_CACHE_TTL }
    );
  } catch (err) {
    logger.log('Failed to cache user me profile', err);
  }
}
