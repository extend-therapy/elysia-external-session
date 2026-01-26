import { Context, Elysia } from "elysia";

// Session Handler
import type { SessionHandlerConfig } from "./SessionHandler";
import { SessionHandler } from "./SessionHandler";
// Export SessionHandler
export * from "./SessionHandler";

// Stores
import { cookieResolver } from "./helpers/cookieResolver";
import { createOrUpdateSession } from "./SessionHandler/helpers/createOrUpdateSession";
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

const defaultConfig = {
  name: "elysia-external-session",
  cookieName: "elysia-external-session",
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
} as const;

type RequiredSessionHandlerConfig<T, U extends BaseStore<T>> = Omit<
  SessionHandlerConfig<T, U>,
  "scope" | "name" | "cookieName" | "cookieOptions"
> &
  Required<Pick<SessionHandlerConfig<T, U>, "scope" | "name" | "cookieName" | "cookieOptions">>;

function SessionPlugin<T, U extends BaseStore<T>>(config: SessionHandlerConfig<T, U>) {
  const mergedConfig = {
    ...defaultConfig,
    cookieOptions: {
      ...defaultConfig.cookieOptions,
      ...config?.cookieOptions,
    },
    ...config,
  } as RequiredSessionHandlerConfig<T, U>;

  const sessionHandler = new SessionHandler<T, U>(mergedConfig);
  const plugin = new Elysia({ name: mergedConfig.name, seed: mergedConfig.seed })
    .decorate("sessionHandler", sessionHandler) // base with lots of features and options
    .decorate("createOrUpdateSession", (args: Parameters<typeof createOrUpdateSession>[0]) =>
      createOrUpdateSession({ ...args }),
    ) // create or update session helper
    .decorate(
      "deleteSessionAndClearCookie",
      async ({ sessionId, cookie }: { sessionId: string; cookie: Context["cookie"] }) => {
        await sessionHandler.deleteSessionAndClearCookie(sessionId, cookie);
      },
    ) // delete session helper
    .derive({ as: "global" }, (ctx) => cookieResolver({ cookie: ctx.cookie, sessionHandler })); // cookie resolver

  return plugin;
}

export default SessionPlugin;
