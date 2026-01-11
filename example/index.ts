import {
  default as SessionPlugin,
  // BunRedisStore,
  // RedisStore,
  // SessionHandler,
  type SessionHandlerConfig,
} from "../src";
import Elysia from "elysia";
import { moduleRouter } from "./moduleRouter";
import { SqliteStore } from "../src/Store/sqlite";

// This doesn't have to extend anything anymore - it just has to be JSON serializable
// What does that mean?
// Example: If you include a Date or function in your session object, then it will not be simply JSON serializable
// Instead use timestamps or other simple data types (Objects as values are generally ok as long as they do not contain functions or dates)
// This is generally the case for redis - but if you create your own store that can store these things, then it's up to you
interface SimpleSession {
  user: unknown;
}

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

// const configBun: SessionHandlerConfig<
//   SimpleSession,
//   BunRedisStore<SimpleSession>
// > = {
//   name: "sessionexamplev1",
//   store: new BunRedisStore<SimpleSession>({
//     cookieName: "sessionexamplev1",
//     expiresAfter: { minutes: 30 },
//     // Not a cluster
//     redisUrl: "redis://redis:6379",
//   }),
// };

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
    (ctx) => {
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
    async (ctx) => {
      const existings = ctx.session;
      const session = Object.assign({}, existings, { user: { name: "John Doe" } } as SimpleSession);
      const encryptedSessionId = await ctx.sessionHandler.createSession({
        session,
      });
      console.log({ encryptedSessionId });
      ctx.set.headers["Set-Cookie"] =
        ctx.sessionHandler.createCookieString(encryptedSessionId);
      return { success: true, message: "Logged in" };
    }
  )
  .post(
    "/logout",
    async (ctx) => {
      if (!ctx.sessionId) {
        ctx.set.status = 400;
        return { success: false, message: "No session to logout from" };
      }
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
