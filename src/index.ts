import { Context, Elysia } from "elysia";

// Session Handler
import type { SessionHandlerConfig } from "./SessionHandler";
import { SessionHandler } from "./SessionHandler";
// Export SessionHandler
export * from "./SessionHandler";

// Stores
import { cookieResolver } from "./helpers/cookieResolver";
import { readRawCookie } from "./helpers/rawCookie";
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

/** Where `transform` leaves the resolved session for `derive` to republish. */
const RESOLVED = Symbol.for("@extend-therapy/elysia-external-session/resolved");

type ResolvedSession<T> = {
  sessionId?: string;
  session?: T;
  sessionInvalidated: boolean;
};

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
    // Two-stage on purpose.
    //
    // Elysia 2.0 runs `derive` post-validation (inside beforeHandle), so a session
    // resolved only there arrives too late for an auth guard: an unauthenticated
    // request is validated first and answered 422, leaking schema details before
    // anything checks who is calling. 1.x resolved it pre-validation, and this
    // restores that ordering.
    //
    // `transform` runs before validation, so the resolve happens there and is
    // stashed on the context. It cannot be the only stage: `transform` adds nothing
    // to the context *type*, and consumers rely on `ctx.session` being typed.
    // `derive` then republishes the stash, which is cheap because the work is
    // already done.
    .transform("global", async (ctx) => {
      const cookieString = readRawCookie(
        ctx.request.headers.get("cookie"),
        sessionHandler.getCookieName(),
      );
      const { sessionId, session } = await sessionHandler.sessionFromCookieString(cookieString);
      const resolved: ResolvedSession<T> = {
        sessionId,
        session,
        // A present-but-undecryptable cookie: see cookieResolver for why this is
        // distinguished from ordinary expiry. The jar is not available yet, so the
        // actual removal happens in the derive below.
        sessionInvalidated: Boolean(cookieString) && !sessionId,
      };

      // Written onto the context directly, not just stashed. A consumer's own
      // pre-validation `transform` -- an auth guard -- reads `ctx.session`, and that
      // key does not otherwise exist until the derive below republishes it, which is
      // post-validation and therefore too late to be worth resolving early at all.
      // The stash is what lets the derive republish without redoing the work.
      const target = ctx as unknown as ResolvedSession<T> & { [RESOLVED]?: ResolvedSession<T> };
      target.session = session;
      target.sessionId = sessionId;
      target.sessionInvalidated = resolved.sessionInvalidated;
      target[RESOLVED] = resolved;
    })
    .derive("global", (ctx) => {
      // No fallback here on purpose. The transform is registered at "global" scope,
      // the same as this derive, so it runs for every route the consumer mounts --
      // verified, because a default-scope transform runs zero times on a consumer's
      // routes. A `cookieResolver` fallback would silently resolve the session a
      // second time post-validation and make a missing transform look like it
      // worked, turning the ordering fix into a no-op nobody noticed.
      const resolved = (ctx as unknown as { [RESOLVED]?: ResolvedSession<T> })[RESOLVED];
      if (!resolved) {
        // Loud rather than silent. Resolving again here would paper over a broken
        // hook registration and quietly restore the post-validation ordering this
        // change exists to remove.
        throw new SessionPluginError(
          "session transform did not run; the plugin's global-scope transform is not registered for this route",
        );
      }
      if (resolved.sessionInvalidated) {
        ctx.cookie[sessionHandler.getCookieName()]?.remove();
      }
      return resolved;
    });

  return plugin;
}

export default SessionPlugin;
