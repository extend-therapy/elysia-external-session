import { RedisClient, type RedisOptions } from "bun";
import { BaseStore, type SessionOptions } from "./base";

export interface RedisStoreOptions extends SessionOptions {
  redisClient?: RedisClient;
  redisOptions?: RedisOptions;
  redisUrl?: string;
  redisExpireAfter?: number;
}

export class RedisStore<T> extends BaseStore<T> {
  private redis: RedisClient;
  private redisExpireAfter: number;

  constructor(options: RedisStoreOptions) {
    super(options);
    const { redisClient, redisOptions, redisUrl, redisExpireAfter } = options;
    if (!redisClient && !redisUrl) {
      throw new Error(
        "options with (redisClient) or (redisUrl) is required to create a RedisStore"
      );
    }
    this.redis =
      redisClient ?? new RedisClient(redisUrl, { ...(redisOptions ?? {}) });

    this.redisExpireAfter =
      typeof redisExpireAfter === "number" &&
      redisExpireAfter >= 0 &&
      redisExpireAfter <= 2147483647
        ? redisExpireAfter
        : 60 * 60 * 6; // redis expiration time in seconds - 6 hours - TODO: make it
    if (!this.redis) {
      throw new Error("Failed to create a RedisStore");
    }
  }

  async get<T>({ sessionId }: { sessionId: string }) {
    await this.redis.connect();
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
