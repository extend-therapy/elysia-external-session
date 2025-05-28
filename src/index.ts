import { Elysia } from "elysia";
import type { BaseStore } from "./Store/base";
import { SessionHandler, type SessionHandlerConfig } from "./SessionHandler";

export { BaseStore } from "./Store/base";
export type { SessionHandlerConfig } from "./SessionHandler";
export { SessionHandler } from "./SessionHandler";
export { RedisStore } from "./Store/redis";

export class SessionPluginError extends Error {
  public readonly name = "SessionPluginError";
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

const SessionPlugin = <T, U extends BaseStore<T>>(
  config: SessionHandlerConfig<T, U>
) =>
  new Elysia({ name: config.name ?? "session" })
    .decorate("sessionHandler", new SessionHandler<T, U>(config))
    .derive({ as: "global" }, async ({ sessionHandler, cookie, request }) => {
      const sessionReturn: {
        sessionId: string | null | undefined;
        session: T | null;
      } = {
        sessionId: undefined,
        session: null,
      };
      const { sessionId, session } = await sessionHandler.sessionFromCookie(
        cookie,
        config.name
      );
      if (!sessionId || !session) {
        return sessionReturn;
      }

      // This does not catch invalid session ids

      return { sessionId, session };
    })
    .onAfterHandle(
      { as: "global" },
      async ({ request, session, sessionId, set, sessionHandler }) => {
        // if (request.headers.get("cookie")) {
        if (session && sessionId) {
          const cookieString = sessionHandler.createCookieString(
            await sessionHandler.encrypt(sessionId)
          );
          const currentCookie = request.headers.get("cookie");
          set.headers["Set-Cookie"] = cookieString;
        }
      }
    );
export default SessionPlugin;
