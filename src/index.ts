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
      if (!cookie || request.method === "GET") {
        return sessionReturn;
      }

      const cookieName = config.name ?? "session";
      const sessionId = cookie[cookieName]?.value;

      // This does not catch invalid session ids
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
    });
export default SessionPlugin;
