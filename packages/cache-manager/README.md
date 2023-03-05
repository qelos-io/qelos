# @qelos/cache-manager

cache manager library for backend services, using redis or internal memory.

## Simple Installation Example

### Install
```bash
$ npm install @qelos/cache-manager
```

```typescript
import {createCacheManager} from '@qelos/cache-manager';
import {redisUrl} from './config';

const cacher = redisUrl ?
  require('@qelos/cache-manager/dist/redis-cache').createRedisCache(redisUrl) :
  require('@qelos/cache-manager/dist/memory-cache').createMemoryCache()

const cacheManager = createCacheManager(cacher);
```

## Get item from cache
```typescript
const value = await cacheManager.getItem('your-cache-key');
```

## Set item to cache
The value must in a string
```typescript

await cacheManager.setItem('your-cache-key', 'new value to store in cache');
```


## Wrap a fallback to get an item

In this method, you can specify a key.
If the key doesn't exist inside the cache store, it will fall back to the function, return its value and store it inside the cache store.

```typescript
const value = await cacheManager.wrap('your-cache-key', async () => {
  const data = await someDatabase.query('select * from MyTable where id = X')
  return JSON.stringify(data);
});
```

### Custom cache options


```typescript

await cacheManager.setItem('your-cache-key', 'new value to store in cache', {
  ttl: 1000 // in seconds
});
```
