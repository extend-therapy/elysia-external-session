import { BaseStore, type SessionOptions } from "./base";

export interface BunRedisStoreOptions extends SessionOptions {
  redisClient?: Bun.RedisClient;
  redisOptions?: Bun.RedisOptions;
  redisUrl?: string;
  redisExpireAfter?: number;
}

/**
 * WARNING: Does not work for Redis Clusters. Use RedisStore instead until Bun supports Redis Clusters.
 */
export class BunRedisStore<T> extends BaseStore<T> {
  private redis: Bun.RedisClient;
  private redisExpireAfter: number;

  constructor(options: BunRedisStoreOptions) {
    super(options);
    const { redisClient, redisOptions, redisUrl, redisExpireAfter } = options;
    if (redisClient) {
      this.redis = redisClient;
    } else if (redisUrl) {
      this.redis = new Bun.RedisClient(redisUrl, redisOptions || {});
    } else {
      throw new Error(
        "RedisStore options with (redisClient) or (redisUrl) is required to create a RedisStore"
      );
    }

    this.redisExpireAfter =
      typeof redisExpireAfter === "number" &&
      redisExpireAfter >= 0 &&
      redisExpireAfter <= 2147483647
        ? redisExpireAfter
        : 60 * 60 * 6; // redis expiration time in seconds - 6 hours
    if (!this.redis) {
      throw new Error("Failed to create a RedisStore");
    }
  }

  async get<T>({ sessionId }: { sessionId: string }) {
    const sessionString: string | null = await this.redis.get(
      `session:${sessionId}`
    );
    // extend the session expiration time and return the session object T
    if (sessionString) {
      await this.redis.expire(`session:${sessionId}`, this.redisExpireAfter);
      return JSON.parse(sessionString) as unknown as T;
    }
    return null;
  }

  async set<T>({ sessionId, session }: { sessionId?: string; session: T }) {
    // unencrypted sessionId passed in
    const sessionString = JSON.stringify(session);
    await this.redis.set(`session:${sessionId}`, sessionString);
    await this.redis.expire(`session:${sessionId}`, this.redisExpireAfter);
  }

  async delete({ sessionId }: { sessionId: string }) {
    await this.redis.del(`session:${sessionId}`);
    return true;
  }
}
