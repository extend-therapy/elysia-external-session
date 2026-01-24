import { Elysia } from "elysia";

// Session Handler
import type { SessionHandlerConfig } from "./SessionHandler";
import { SessionHandler } from "./SessionHandler";
// Export SessionHandler
export * from "./SessionHandler";

// Stores
import type { BaseStore } from "./Store";
// Export all stores
export * from "./Store";

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
