import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import { BaseStore, type SessionOptions } from "./base";

export interface RedisStoreOptions extends SessionOptions {
  redisClient?: Redis;
  redisOptions?: RedisOptions;
  redisUrl?: string;
  redisExpireAfter?: number;
}

export class RedisStore<T> extends BaseStore<T> {
  private redis: Redis;
  private redisExpireAfter: number;

  constructor(options: RedisStoreOptions) {
    super(options);
    const { redisClient, redisOptions, redisUrl, redisExpireAfter } = options;
    if (redisClient) {
      this.redis = redisClient;
    } else if (redisUrl) {
      this.redis = new Redis(redisUrl);
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
    // extend the session expiration time
    if (sessionString) {
      await this.redis.expire(`session:${sessionId}`, this.expireAfter);
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
