import { IAuditItem } from '../models/blueprint-entity';
import { cacheManager } from './cache-manager';

const REQUESTS_LIMIT = 10;
const LIMIT_TTL = 5; // seconds

const KEY_PREFIX = 'no-code::guest-request::count::'

export async function hasGuestReachedLimit(auditItem: IAuditItem): Promise<boolean> {
  try {
    const key = `${KEY_PREFIX}${auditItem.ip}::${auditItem.userAgent}`;
    const count = Number((await cacheManager.getItem(key).catch(() => 0)) || 0);

    if (count > REQUESTS_LIMIT) {
      return true;
    }
    cacheManager.setItem(key, ((count + 1) || 1).toString(), { ttl: LIMIT_TTL }).catch();

    return false;
  } catch {
    return true;
  }
}