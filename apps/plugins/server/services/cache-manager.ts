const { redisUrl } = require('../../config')

const { createCacheManager } = require('@qelos/cache-manager');

const cacher = redisUrl ?
  require('@qelos/cache-manager/dist/redis-cache').createRedisCache(redisUrl) :
  require('@qelos/cache-manager/dist/memory-cache').createMemoryCache()

export const cacheManager = createCacheManager(cacher);
