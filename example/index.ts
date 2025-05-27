import Redis from "ioredis";
import {
  default as SessionPlugin,
  RedisStore,
  SessionHandler,
  type SessionHandlerConfig,
} from "../src";
import Elysia, { type Context } from "elysia";
import { moduleRouter } from "./moduleRouter";

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

const requiresSessionWithUser = (ctx: any) => {
  console.log("requiresSessionWithUser");
  if (!ctx.session?.user) {
    console.log("Unauthorized");
    ctx.set.status = 401;
    return { success: false, message: "Unauthorized" };
  }
};

const app = new Elysia();

const config: SessionHandlerConfig<SimpleSession, RedisStore<SimpleSession>> = {
  name: "sessionexamplev1",
  store: new RedisStore<SimpleSession>({
    cookieName: "sessionexamplev1",
    expireAfter: 60 * 60 * 24 * 30,
    redisUrl: Bun.env.REDIS_URL ?? "redis://redis:6379",
  }),
};

app
  .use(SessionPlugin(config))
  .get("/", (ctx) => {
    return `Hello World no session ${ctx.sessionId}`;
  })
  .post(
    "/auth",
    (ctx: Context & { session: SimpleSession; sessionId: string }) => {
      // Should not get here if called before login
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
