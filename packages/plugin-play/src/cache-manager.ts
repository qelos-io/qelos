import {CacheManager, createCacheManager} from '@qelos/cache-manager';

import config from './config';

const cacher = config.redisUrl ?
  require('@qelos/cache-manager/dist/redis-cache').createRedisCache(config.redisUrl) :
  require('@qelos/cache-manager/dist/memory-cache').createMemoryCache()

export const cacheManager: CacheManager = createCacheManager(cacher, {ttl: 60 * 30});
