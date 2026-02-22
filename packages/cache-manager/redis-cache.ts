import { ICache } from "./cache-type";
import { promisify } from "node:util";
import { createClient } from 'redis';
import { CacheManagerOptions } from "./cache-manager-options";

export function createRedisCache(redisUrl: string): ICache {
    const client = createClient(redisUrl);
    client.on("connect", function () {
        console.log('redis is connected for cache manager');
    });
    client.on("error", function (error) {
        console.warn("failed to connect to redis server");
    });

    const getItem = promisify(client.get).bind(client);
    const setItem = promisify(client.set).bind(client);

    const setnxWithExpire = promisify((key: string, value: string, nx: string, ex: string, ttl: number, cb: (err: Error | null, reply: string | null) => void) => {
        client.set(key, value, nx, ex, ttl, cb);
    });

    return {
        getItem,
        async setItem(key: string, value: string, { ttl }: CacheManagerOptions): Promise<void> {
            await setItem(key, value);
            if (ttl) {
                client.expire(key, ttl);
            }
        },
        async setIfNotExists(key: string, value: string, { ttl }: CacheManagerOptions): Promise<boolean> {
            if (ttl) {
                const result = await setnxWithExpire(key, value, 'NX', 'EX', ttl);
                return result === 'OK';
            }
            const result = await promisify(client.setnx).bind(client)(key, value);
            return result === 1;
        }
    };
}
