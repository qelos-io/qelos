import crypto from 'crypto';
import ApiToken, { ApiTokenDocument, IApiToken } from '../models/api-token';
import User from '../models/user';
import { getWorkspaceForUser } from './workspaces';
import { IAuthConfigurationMetadata } from '@qelos/global-types';
import logger from './logger';
import { cacheManager } from './cache-manager';

const API_TOKEN_CACHE_TTL = 3600; // 60 minutes in seconds

function apiTokenCacheKey(tenant: string, hashedToken: string): string {
  return `api-token:${tenant}:${hashedToken}`;
}

const TOKEN_PREFIX = 'ql_';
const MAX_TOKENS_PER_USER = 10;

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString('hex');
}

export async function createApiToken(
  tenant: string,
  userId: string,
  workspace: string | null,
  nickname: string,
  expiresAt: Date
): Promise<{ rawToken: string; apiToken: IApiToken }> {
  const existingCount = await ApiToken.countDocuments({ tenant, user: userId });
  if (existingCount >= MAX_TOKENS_PER_USER) {
    const error: any = new Error(`Maximum ${MAX_TOKENS_PER_USER} active tokens allowed per user`);
    error.code = 'MAX_TOKENS_REACHED';
    throw error;
  }

  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);
  const tokenPrefix = rawToken.substring(0, 8);

  const apiToken = await ApiToken.create({
    tenant,
    user: userId,
    workspace: workspace || null,
    nickname,
    token: hashedToken,
    tokenPrefix,
    expiresAt,
  } as any) as IApiToken;

  return { rawToken, apiToken };
}

export async function listApiTokens(
  tenant: string,
  userId: string
): Promise<Array<Partial<ApiTokenDocument>>> {
  return ApiToken.find({ tenant, user: userId })
    .select('nickname tokenPrefix expiresAt lastUsedAt workspace created')
    .sort({ created: -1 })
    .lean()
    .exec();
}

export async function deleteApiToken(
  tenant: string,
  userId: string,
  tokenId: string
): Promise<boolean> {
  const apiToken = await ApiToken.findOne({ _id: tokenId, tenant, user: userId }).select('token').lean().exec();
  if (!apiToken) return false;

  const result = await ApiToken.deleteOne({ _id: tokenId, tenant, user: userId });
  if (result.deletedCount > 0) {
    // Invalidate cache by overwriting with empty value and minimal TTL
    const cacheKey = apiTokenCacheKey(tenant, apiToken.token);
    cacheManager.setItem(cacheKey, '', { ttl: 1 }).catch(err =>
      logger.log('Failed to invalidate api token cache', err)
    );
    return true;
  }
  return false;
}

export async function authenticateByApiToken(
  tenant: string,
  rawToken: string
): Promise<{ user: any; workspace: any; isTokenAuth: true } | null> {
  if (!rawToken || !rawToken.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const hashedToken = hashToken(rawToken);
  const cacheKey = apiTokenCacheKey(tenant, hashedToken);

  // Try cache first
  try {
    const cached = await cacheManager.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.user) {
        return { ...parsed, isTokenAuth: true };
      }
      // Empty or invalid cache entry (invalidated token)
      return null;
    }
  } catch {
    // Cache miss or parse error, proceed with DB lookup
  }

  const apiToken = await ApiToken.findOne({ token: hashedToken, tenant });

  if (!apiToken) {
    return null;
  }

  if (apiToken.expiresAt < new Date()) {
    return null;
  }

  ApiToken.updateOne(
    { _id: apiToken._id },
    { $set: { lastUsedAt: new Date() } }
  ).exec().catch(err => logger.log('Failed to update lastUsedAt', err));

  const user = await User.findOne({
    _id: apiToken.user,
    tenant,
  }).exec();

  if (!user) {
    return null;
  }

  let workspace = null;
  if (apiToken.workspace) {
    try {
      workspace = await getWorkspaceForUser(
        tenant,
        apiToken.user.toString(),
        apiToken.workspace.toString()
      );
    } catch {
      return null;
    }
  }

  const result = { user, workspace };

  // Cache the result
  // Use token expiry or 60min, whichever is shorter
  const tokenTtl = Math.floor((apiToken.expiresAt.getTime() - Date.now()) / 1000);
  const ttl = Math.min(API_TOKEN_CACHE_TTL, Math.max(tokenTtl, 0));
  if (ttl > 0) {
    cacheManager.setItem(cacheKey, JSON.stringify(result), { ttl }).catch(err =>
      logger.log('Failed to cache api token auth result', err)
    );
  }

  return { ...result, isTokenAuth: true };
}

export function isUserPermittedToManageTokens(
  userRoles: string[],
  authConfig: IAuthConfigurationMetadata,
  wsRoles?: string[]
): boolean {
  if (!authConfig.allowUserTokenAuthentication) {
    return false;
  }

  const permissions = authConfig.tokenAuthenticationPermissions;
  if (!permissions) {
    return false;
  }

  if (permissions.roles?.length > 0) {
    const rolesMatch = permissions.roles.includes('*') ||
      permissions.roles.some(role => userRoles.includes(role));
    if (rolesMatch) return true;
  }

  if (wsRoles && permissions.wsRoles?.length > 0) {
    return permissions.wsRoles.includes('*') ||
      permissions.wsRoles.some(role => wsRoles.includes(role));
  }

  return false;
}
