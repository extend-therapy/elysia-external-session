import type { Duration } from "date-fns";
import { BaseStore, type SessionOptions } from "./base";
export interface BunRedisStoreOptions extends SessionOptions {
    redisClient?: Bun.RedisClient;
    redisOptions?: Bun.RedisOptions;
    redisUrl?: string;
    expiresAfter?: Duration;
}
/**
 * WARNING: Does not work for Redis Clusters. Use RedisStore instead until Bun supports Redis Clusters.
 */
export declare class BunRedisStore<T> extends BaseStore<T> {
    private redis;
    private redisExpireAfterSeconds;
    constructor(options: BunRedisStoreOptions);
    get<T>({ sessionId }: {
        sessionId: string;
    }): Promise<T | null>;
    set<T>({ sessionId, session }: {
        sessionId: string;
        session: T;
    }): Promise<void>;
    delete({ sessionId }: {
        sessionId: string;
    }): Promise<boolean>;
}
