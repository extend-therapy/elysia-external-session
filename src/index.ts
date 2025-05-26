import { Elysia } from "elysia";
import type { BaseStore } from "./Store/base";
import type { BaseSession } from "./SessionHandler";
import type { SessionHandlerConfig } from "./SessionHandler";
import { SessionHandler } from "./SessionHandler";
import { RedisStore } from "./Store/redis";

export class SessionPluginError extends Error {
  public readonly name = "SessionPluginError";
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

const SessionPlugin = <T extends BaseSession, U extends BaseStore<T>>(
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
      if (!cookie || request.method === "GET") {
        return sessionReturn;
      }
      const cookieName = config.name ?? "session";
      const sessionId = cookie[cookieName]?.value;
      // does not catch invalid session ids
      if (sessionId) {
        const decryptedSessionId = await sessionHandler.getSessionId(sessionId);
        if (!decryptedSessionId) {
          throw new SessionPluginError("Invalid session id");
        }
        const session = await sessionHandler.getSession({
          sessionId: decryptedSessionId as string,
        });
        sessionReturn.sessionId = decryptedSessionId;
        sessionReturn.session = session;
      }
      return sessionReturn;
    })
    .onBeforeHandle(
      { as: "global" },
      async ({ request, sessionId, sessionHandler, set, session }) => {
        /**
         * We do not update the session in the beforeHandle or afterHandle. If you change the values in the session object
         * you need to call the sessionStore.set() method to update the session. If that sessionId is not found in the store
         * it will be created.
         */
        if (request.method === "GET") {
          // don't create a session for GET requests
          return;
        }
        if (!sessionId) {
          // empty session - returns encrypted sessionId
          const newSessionId = await sessionHandler.createSession({} as T);
          const cookieString = sessionHandler.createCookieString(newSessionId);
          set.headers["Set-Cookie"] = cookieString;
        }
        return;
      }
    );
export default SessionPlugin;

export {
  SessionHandler,
  type BaseSession,
  type BaseStore,
  type SessionHandlerConfig,
  RedisStore,
};
