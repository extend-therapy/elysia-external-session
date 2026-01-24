import { describe, expect, it } from "bun:test";
import Elysia from "elysia";
import {
  default as SessionPlugin,
  SqliteStore,
  type SessionHandlerConfig
} from "../src";
import { moduleRouter } from "./moduleRouter";

// This doesn't have to extend anything anymore - it just has to be JSON serializable
// What does that mean?
// Example: If you include a Date or function in your session object, then it will not be simply JSON serializable
// Instead use timestamps or other simple data types (Objects as values are generally ok as long as they do not contain functions or dates)
// This is generally the case for redis - but if you create your own store that can store these things, then it's up to you
interface SimpleSession {
  user: unknown;
}

const requiresSessionWithUser = (ctx: any) => {
  if (!ctx.session?.user) {
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
    expiresAfter: { minutes: 30 },
  }),
};


app
  .use(SessionPlugin(configSqlite))
  .get("/", (ctx) => {
    return `Hello World no session ${ctx.sessionId}`;
  })
  .post(
    "/auth",
    () => {
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
      ctx.set.status = 200;
      ctx.set.headers["Set-Cookie"] =
        await ctx.sessionHandler.deleteSessionAndClearCookie(ctx.sessionId);
      return { success: true, message: "Logged out" };
    }
  )
  .use(moduleRouter);


describe("Example Server Tests", () => {
  it("should return hello world and a session ID on /", async () => {
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Hello World no session");
  });

  it("should return 401 on /auth when not logged in", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth", { method: "POST" })
    );
    expect(response.status).toBe(401);
    const json: any = await response.json();
    expect(json.success).toBe(false);
    expect(json.message).toBe("Unauthorized");
  });

  it("should login and access /auth with cookie", async () => {
    // 1. Login
    const loginResponse = await app.handle(
      new Request("http://localhost/login", { method: "POST" })
    );
    expect(loginResponse.status).toBe(200);
    const loginJson: any = await loginResponse.json();
    expect(loginJson.success).toBe(true);

    const setCookie = loginResponse.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();

    // 2. Access /auth with cookie
    const authResponse = await app.handle(
      new Request("http://localhost/auth", {
        method: "POST",
        headers: {
          Cookie: setCookie!,
        },
      })
    );
    expect(authResponse.status).toBe(200);
    const authJson: any = await authResponse.json();
    expect(authJson.success).toBe(true);
    expect(authJson.message).toBe("You may access this page");
  });

  it("should logout successfully", async () => {
    // 1. Login to get a session
    const loginResponse = await app.handle(
      new Request("http://localhost/login", { method: "POST" })
    );
    const setCookie = loginResponse.headers.get("Set-Cookie");

    // 2. Logout
    const logoutResponse = await app.handle(
      new Request("http://localhost/logout", {
        method: "POST",
        headers: {
          Cookie: setCookie!,
        },
      })
    );
    expect(logoutResponse.status).toBe(200);
    const logoutJson: any = await logoutResponse.json();
    expect(logoutJson.success).toBe(true);
    expect(logoutJson.message).toBe("Logged out");

    const logoutSetCookie = logoutResponse.headers.get("Set-Cookie");
    expect(logoutSetCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");

    // 3. Verify /auth is 401 again
    const authResponse = await app.handle(
      new Request("http://localhost/auth", {
        method: "POST",
        headers: {
          Cookie: setCookie!,
        },
      })
    );
    expect(authResponse.status).toBe(401);
  });

  it("should work with module router", async () => {
    const response = await app.handle(new Request("http://localhost/module"));
    expect(response.status).toBe(200);
    const json: any = await response.json();
    expect(json.ctxSessionId).toBeDefined();
    expect(json.ctxSession).toBe("no session");
  });
});
