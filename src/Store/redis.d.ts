import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import { BaseStore, type SessionOptions } from "./base";
import type { Duration } from "date-fns";
export interface RedisStoreOptions extends SessionOptions {
    redisClient?: Redis;
    redisOptions?: RedisOptions;
    redisUrl?: string;
    redisExpireAfter?: Duration;
}
export declare class RedisStore<T> extends BaseStore<T> {
    private redis;
    private redisExpireAfterSeconds;
    constructor(options: RedisStoreOptions);
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
    getFlash({ sessionId }: {
        sessionId: string;
    }): Promise<string | null>;
    setFlash({ sessionId, flash }: {
        sessionId: string;
        flash: string;
    }): Promise<void>;
}
