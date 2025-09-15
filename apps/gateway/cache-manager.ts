import { createCacheManager } from "@qelos/cache-manager";

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : undefined);
const cacher = redisUrl
  ? require("@qelos/cache-manager/dist/redis-cache").createRedisCache(
      redisUrl
    )
  : require("@qelos/cache-manager/dist/memory-cache").createMemoryCache();

const cacheManager = createCacheManager(cacher);

export default cacheManager;
