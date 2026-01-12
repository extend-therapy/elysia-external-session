import { Elysia } from "elysia";
import type { BaseStore } from "./Store/base";
import { SessionHandler, type SessionHandlerConfig } from "./SessionHandler";

export { type SessionHandlerConfig } from "./SessionHandler";
export { SessionHandler } from "./SessionHandler";

// Stores
export { BaseStore, type SessionOptions } from "./Store/base";
// Redis Store - Supports Redis Clusters.
export { RedisStore, type RedisStoreOptions } from "./Store/redis";

// Bun Redis Store - Not supported for Redis Clusters. Use RedisStore instead until Bun supports Redis Clusters.
export { BunRedisStore, type BunRedisStoreOptions } from "./Store/bunredis";

// Sqlite Store
export { SqliteStore, type SqliteStoreOptions } from "./Store/sqlite";

export class SessionPluginError extends Error {
  public readonly name = "SessionPluginError";
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

function SessionPlugin<T, U extends BaseStore<T>>(
  config: SessionHandlerConfig<T, U>,
  mockSession?: T
) {
  return new Elysia({ name: config.name ?? "plugin-session" })
    .decorate("sessionHandler", new SessionHandler<T, U>(config))
    .resolve({ as: "global" }, async ({ sessionHandler, cookie }) => {
      const sessionReturn: {
        sessionId: string | null | undefined;
        session: T | null;
      } = {
        sessionId: undefined,
        session: null,
      };
      const { sessionId, session } = await sessionHandler.sessionFromCookie(
        cookie
      );
      if (mockSession) {
        return { sessionId: "testid", session: mockSession };
      }
      if (!sessionId || !session) {
        return sessionReturn;
      }

      // This does not catch invalid session ids

      return { sessionId, session };
    })
    .onAfterHandle(
      { as: "global" },
      async ({ session, sessionId, set, sessionHandler }) => {
        if (session && sessionId) {
          const cookieString = sessionHandler.createCookieString(
            await sessionHandler.encrypt(sessionId)
          );
          if (cookieString) {
            return
          }
          set.headers["Set-Cookie"] = cookieString;
        }
      }
    );
}
export default SessionPlugin;
