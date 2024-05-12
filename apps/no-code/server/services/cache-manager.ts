import { createCacheManager } from '@qelos/cache-manager';
import { redisUrl } from '../../config';

const cacher = redisUrl ?
  require('@qelos/cache-manager/dist/redis-cache').createRedisCache(redisUrl) :
  require('@qelos/cache-manager/dist/memory-cache').createMemoryCache()

export const cacheManager = createCacheManager(cacher);
