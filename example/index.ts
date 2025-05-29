import {
  default as SessionPlugin,
  BunRedisStore,
  RedisStore,
  SessionHandler,
  type SessionHandlerConfig,
} from "../src";
import Elysia, { type Context } from "elysia";
import { moduleRouter } from "./moduleRouter";
import { SqliteStore } from "@/Store/sqlite";

// This doesn't have to extend anything anymore - it just has to be JSON serializable
// What does that mean?
// Example: If you include a Date or function in your session object, then it will not be simply JSON serializable
// Instead use timestamps or other simple data types (Objects as values are generally ok as long as they do not contain functions or dates)
// This is generally the case for redis - but if you create your own store that can store these things, then it's up to you
interface SimpleSession {
  user: any | undefined;
}

export type MySessionHandler = SessionHandler<
  SimpleSession,
  RedisStore<SimpleSession>
>;

export type MyBunSessionHandler = SessionHandler<
  SimpleSession,
  BunRedisStore<SimpleSession>
>;

const requiresSessionWithUser = (ctx: any) => {
  console.log("requiresSessionWithUser");
  if (!ctx.session?.user) {
    console.log("Unauthorized");
    ctx.set.status = 401;
    return { success: false, message: "Unauthorized" };
  }
};

const app = new Elysia();

const configSqlite: SessionHandlerConfig<
  SimpleSession,
  SqliteStore<SimpleSession>
> = {
  name: "sessionexamplev1",
  store: new SqliteStore<SimpleSession>({
    cookieName: "sessionexamplev1",
    dbPath: ":memory:",
    expireAfter: { minutes: 30 },
  }),
};

const config: SessionHandlerConfig<SimpleSession, RedisStore<SimpleSession>> = {
  name: "sessionexamplev1",
  store: new RedisStore<SimpleSession>({
    cookieName: "sessionexamplev1",
    expireAfter: { minutes: 30 },
    redisExpireAfter: { minutes: 30 },
    // Can be a cluster - but here it is not and can use the same URL
    redisUrl: "redis://redis:6379",
  }),
};

const configBun: SessionHandlerConfig<
  SimpleSession,
  BunRedisStore<SimpleSession>
> = {
  name: "sessionexamplev1",
  store: new BunRedisStore<SimpleSession>({
    cookieName: "sessionexamplev1",
    expireAfter: { minutes: 30 },
    redisExpireAfter: { minutes: 30 },
    // Not a cluster
    redisUrl: "redis://redis:6379",
  }),
};

app
  // Use RedisStore
  // .use(SessionPlugin(config))
  // Or Use BunRedisStore
  // .use(SessionPlugin(configBun))
  .use(SessionPlugin(configSqlite))
  .get("/", (ctx) => {
    return `Hello World no session ${ctx.sessionId}`;
  })
  .post(
    "/auth",
    (ctx: Context & { session: SimpleSession; sessionId: string }) => {
      // Should not get here if called before login
      console.log("auth", ctx.sessionId);
      return { success: true, message: "You may access this page" };
    },
    {
      beforeHandle: requiresSessionWithUser,
    }
  )
  .post(
    "/login",
    async (
      ctx: Context & {
        session: SimpleSession;
        sessionHandler: MySessionHandler;
      }
    ) => {
      ctx.session = { user: { name: "John Doe" } } as SimpleSession;
      const encryptedSessionId = await ctx.sessionHandler.createSession({
        session: ctx.session,
      });
      console.log({ encryptedSessionId });
      ctx.set.headers["Set-Cookie"] =
        ctx.sessionHandler.createCookieString(encryptedSessionId);
      return { success: true, message: "Logged in" };
    }
  )
  .post(
    "/logout",
    async (
      ctx: Context & {
        session: SimpleSession;
        sessionId: string;
        sessionHandler: MySessionHandler;
      }
    ) => {
      console.log("logout", ctx.sessionId);
      ctx.set.status = 200;
      ctx.set.headers["Set-Cookie"] =
        await ctx.sessionHandler.deleteSessionAndClearCookie(ctx.sessionId);
      return { success: true, message: "Logged out" };
    }
  )
  .use(moduleRouter);

const port = parseInt(Bun.env.PORT ?? "3000");
app.listen(!isNaN(port) ? port : 3000);
console.log("Listening on port", port);
