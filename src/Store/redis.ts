import { durationToSeconds } from "@/helpers/durationToSeconds";
import type { Duration } from "date-fns";
import { BaseStore, type SessionOptions } from "./base";
export interface RedisStoreOptions extends SessionOptions {
  redisClient?: Bun.RedisClient;
  redisOptions?: Bun.RedisOptions;
  redisUrl?: string;
  expiresAfter?: Duration;
}

/**
 * WARNING: Does not work for Redis Clusters. Use RedisStore instead until Bun supports Redis Clusters.
 */
export class BunRedisStore<T> extends BaseStore<T> {
  private redis: Bun.RedisClient;
  private redisExpiresAfterSeconds: number;

  constructor(options: RedisStoreOptions) {
    super(options);
    const { redisClient, redisOptions, redisUrl, expiresAfter } = options;
    if (redisClient) {
      this.redis = redisClient;
    } else if (redisUrl) {
      this.redis = new Bun.RedisClient(redisUrl, redisOptions || {});
    } else {
      throw new Error(
        "RedisStore options with (redisClient) or (redisUrl) is required to create a RedisStore",
      );
    }
    this.redisExpiresAfterSeconds = durationToSeconds({
      duration: expiresAfter,
      useMin: true,
      useMax: true,
      minSeconds: 60,
      maxSeconds: 2147483647,
    });

    if (!this.redis) {
      throw new Error("Failed to create a RedisStore");
    }
  }

  async get({ sessionId }: { sessionId: string }) {
    //  Bun.RedisClient says it has getex but it doesn't seem correct
    const sessionString: string | null = await this.redis.get(`session:${sessionId}`);
    // extend the session expiration time and return the session object T
    if (sessionString) {
      await this.redis.expire(`session:${sessionId}`, this.redisExpiresAfterSeconds);
      return JSON.parse(sessionString) as unknown as T;
    }
    return null;
  }

  async set({ sessionId, session }: { sessionId: string; session: T }) {
    // unencrypted sessionId passed in
    const sessionString = JSON.stringify(session);
    await this.redis.set(
      `session:${sessionId}`,
      sessionString,
      "EX",
      this.redisExpiresAfterSeconds,
    );
  }

  async delete({ sessionId }: { sessionId: string }) {
    await this.redis.del(`session:${sessionId}`);
    return true;
  }
}
