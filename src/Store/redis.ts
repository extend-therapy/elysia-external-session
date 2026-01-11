import { RedisClient, type RedisOptions } from "bun";
import { BaseStore, type SessionOptions } from "./base";
import { durationToSeconds } from "@/helpers/durationToSeconds";
import type { Duration } from "date-fns";

export interface RedisStoreOptions extends SessionOptions {
  redisClient?: RedisClient;
  redisOptions?: RedisOptions;
  redisUrl?: string;
  redisExpireAfter?: Duration;
}

export class RedisStore<T> extends BaseStore<T> {
  private redis: RedisClient;
  private redisExpireAfterSeconds: number;

  constructor(options: RedisStoreOptions) {
    super(options);
    const { redisClient, redisOptions, redisUrl, redisExpireAfter } = options;
    if (redisClient) {
      this.redis = redisClient;
    } else if (redisUrl) {
      this.redis = new RedisClient(redisUrl, redisOptions);
    } else {
      throw new Error(
        "RedisStore options with (redisClient) or (redisUrl) is required to create a RedisStore"
      );
    }

    this.redisExpireAfterSeconds = durationToSeconds({
      duration: redisExpireAfter,
      useMinMaxSeconds: true,
      minSeconds: 60,
      maxSeconds: 2147483647,
    });
    if (!this.redis) {
      throw new Error("Failed to create a RedisStore");
    }
  }

  async get<T>({ sessionId }: { sessionId: string }) {
    // get the session and extend the expiration time if it exists
    const sessionString: string | null = await this.redis.getex(
      `session:${sessionId}`,
      "EX",
      this.redisExpireAfterSeconds
    );
    // return the session object T
    if (sessionString) {
      return JSON.parse(sessionString) as T;
    }
    return null;
  }

  async set<T>({ sessionId, session }: { sessionId: string; session: T }) {
    // unencrypted sessionId passed in
    const sessionString = JSON.stringify(session);
    await this.redis.setex(
      `session:${sessionId}`,
      this.redisExpireAfterSeconds,
      sessionString
    );
  }

  async delete({ sessionId }: { sessionId: string }) {
    await this.redis.del(`session:${sessionId}`);
    return true;
  }

  // get and delete flash message
  async getFlash({ sessionId }: { sessionId: string }) {
    const flashString: string | null = await this.redis.get(
      `flash:${sessionId}`
    );
    if (flashString) {
      await this.redis.del(`flash:${sessionId}`);
      return flashString;
    }
    return null;
  }
  // set flash message
  async setFlash({ sessionId, flash }: { sessionId: string; flash: string }) {
    await this.redis.setex(
      `flash:${sessionId}`,
      this.redisExpireAfterSeconds,
      flash
    );
  }
}
