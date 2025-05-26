import { env, RedisClient } from "bun";
import {
  default as SessionPlugin,
  RedisStore,
  SessionHandler,
  type BaseSession,
} from "../src";
import Elysia, { type Context } from "elysia";

interface SimpleSession extends BaseSession {
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
    return "Unauthorized";
  }
};

const app = new Elysia();
const redisClient = new RedisClient("redis://redis:6379");
app
  .use(
    SessionPlugin({
      name: "sessionexamplev1",
      store: new RedisStore<SimpleSession>({
        cookieName: "sessionexamplev1",
        expireAfter: 60 * 60 * 24 * 30,
        redisClient: redisClient,
      }),
    })
  )
  .get("/", (ctx) => {
    return `Hello World no session ${ctx.sessionId}`;
  })
  .post(
    "/triedauthenticated",

    (ctx: Context & { session: SimpleSession; sessionId: string }) => {
      // Should not get here if called before login
      console.log("authenticated", ctx.session);
      ctx.set.status = 200;
      return { success: "You may access this page" };
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
        sessionId: string;
        sessionHandler: MySessionHandler;
      }
    ) => {
      ctx.session = { user: { name: "John Doe" } } as SimpleSession;
      await ctx.sessionHandler.setSession({
        sessionId: ctx.sessionId,
        session: ctx.session,
      });
      return "Logged in";
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
      return { success: "Logged out" };
    }
  );

const port = parseInt(env.PORT ?? "3000");
app.listen(!isNaN(port) ? port : 3000);
console.log("Listening on port", port);
