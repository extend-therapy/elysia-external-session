import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { CookieOptions, Elysia } from "elysia";
import SessionPlugin from "../src";
import { Encryption } from "../src/Encryption";
import { SqliteStore } from "../src/Store/sqlite";

const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as CookieOptions;

describe("Elysia Session Plugin Integration", () => {
  let db: Database;
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE sessions (session_id TEXT PRIMARY KEY, session TEXT, expires_at INTEGER)`);
    process.env.ENCRYPTION_KEY = testKey;
  });

  test("should integrate with Elysia and handle session flow", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });

    const app = new Elysia()
      .use(
        SessionPlugin({
          store,
          name: "test-plugin",
          cookieName: "session",
          cookieOptions: baseCookieOptions,
          scope: "global",
        }),
      )
      .get("/set", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        const encryptedId = await createOrUpdateSession({
          sessionHandler,
          cookieName: "session",
          cookie,
          session: { user: "bob" },
          cookieOptions: baseCookieOptions,
        });
        return { encryptedId };
      })
      .use(
        SessionPlugin({
          store,
          cookieName: "scoped-session",
          scope: "scoped",
        }),
      )
      .get("/get", ({ session, sessionId }) => {
        return { session, sessionId };
      });

    // 1. Create session
    const resSet = await app.handle(new Request("http://localhost/set"));
    const { encryptedId } = (await resSet.json()) as { encryptedId: string };

    expect(encryptedId).toBeDefined();
    // In current implementation, onAfterHandle sets the cookie if session and sessionId are present in context
    // However, /set doesn't return them in context, it just creates them via handler.
    // Let's test a route that uses the session.

    const appWithSession = new Elysia()
      .use(
        SessionPlugin({
          store,
          cookieName: "session",
          scope: "global",
        }).as("global"),
      )
      .get("/profile", ({ session, sessionId }) => {
        return { session, sessionId };
      });

    const resGet = await appWithSession.handle(
      new Request("http://localhost/profile", {
        headers: {
          Cookie: `session=${encryptedId}`,
        },
      }),
    );

    const data = (await resGet.json()) as { session: any; sessionId: string };
    expect(data.session).toEqual({ user: "bob" });
    expect(data.sessionId).toBeDefined();

    // 2. Verify Set-Cookie header content
    // Note: In Elysia app.handle, the cookie should be in the headers
    const setCookie = resGet.headers.get("Set-Cookie");
    if (setCookie) {
      // It should NOT contain "session=session="
      expect(setCookie).not.toContain("session=session=");
      // It should start with "session="
      expect(setCookie).toMatch(/^session=[^;]+/);
    }
  });

  test("should not set cookie if session and sessionId are missing", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });
    const app = new Elysia().use(SessionPlugin({ store, scope: "global" })).get("/none", () => {
      return "ok";
    });

    const res = await app.handle(new Request("http://localhost/none"));
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });
  test("should delete session and clear cookie", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });
    const app = new Elysia()
      .use(SessionPlugin({ store, scope: "global", cookieName: "session" }))
      .get("/set", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        const encryptedId = await createOrUpdateSession({
          sessionHandler,
          cookieName: "session",
          cookie,
          session: { user: "bob" },
          cookieOptions: baseCookieOptions,
        });
        return { encryptedId };
      })
      .get("/delete", async ({ sessionHandler, sessionId, cookie }) => {
        if (!sessionId) return "no session";
        await sessionHandler.deleteSessionAndClearCookie(sessionId, cookie);
        return { status: "ok" };
      });

    // 1. Create session
    const resSet = await app.handle(new Request("http://localhost/set"));
    const { encryptedId } = (await resSet.json()) as { encryptedId: string };

    // 2. Delete session
    const resDel = await app.handle(
      new Request("http://localhost/delete", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    await resDel.json(); // Consume response body

    // Verify Set-Cookie header for deletion
    const setCookie = resDel.headers.get("Set-Cookie");
    expect(setCookie).toContain("session=;");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");

    // 3. Verify session is gone from store
    const decryptedId = await new Encryption().decrypt(encryptedId);
    const sessionInDb = db.query("SELECT * FROM sessions WHERE session_id = ?").get(decryptedId);
    expect(sessionInDb).toBeNull();
  });

  test("should handle flash messages", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });
    const app = new Elysia()
      .use(SessionPlugin({ store, scope: "global", cookieName: "session" }))
      .get("/set-session", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        await createOrUpdateSession({
          sessionHandler,
          cookieName: "session",
          cookie,
          session: { user: "bob" },
          cookieOptions: baseCookieOptions,
        });
        return { ok: true };
      })
      .get("/set-flash", async ({ sessionHandler, sessionId }) => {
        if (!sessionId) return "no session";
        await sessionHandler.setFlash!({ sessionId, flash: "hello" });
        return { ok: true };
      })
      .get("/get-flash", async ({ sessionHandler, sessionId }) => {
        if (!sessionId) return "no session";
        const flash = await sessionHandler.getFlash!({ sessionId });
        return { flash };
      });

    // 1. Create session
    const res1 = await app.handle(new Request("http://localhost/set-session"));
    const setCookieHeader = res1.headers.get("Set-Cookie");
    const encryptedId = setCookieHeader?.split(";")[0]?.split("=")[1];

    // 2. Set flash
    await app.handle(
      new Request("http://localhost/set-flash", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );

    // 3. Get flash (first time)
    const res3 = await app.handle(
      new Request("http://localhost/get-flash", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    const data3 = (await res3.json()) as { flash: string };
    expect(data3.flash).toBe("hello");

    // 4. Get flash (second time) - should be gone
    const res4 = await app.handle(
      new Request("http://localhost/get-flash", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    const data4 = (await res4.json()) as { flash: string };
    expect(data4.flash).toBeNull();
  });

  test("should expire session", async () => {
    // 1s expiration
    const store = new SqliteStore<any>({ db, expiresAfter: { seconds: 1 } });
    const app = new Elysia()
      .use(SessionPlugin({ store, scope: "global", cookieName: "session" }))
      .get("/set", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        const encryptedId = await createOrUpdateSession({
          sessionHandler,
          cookieName: "session",
          cookie,
          session: { user: "bob" },
          cookieOptions: baseCookieOptions,
        });
        return { encryptedId };
      })
      .get("/get", ({ session }) => {
        return { session };
      });

    const res1 = await app.handle(new Request("http://localhost/set"));
    const { encryptedId } = (await res1.json()) as { encryptedId: string };

    // Immediate check - should be there
    const res2 = await app.handle(
      new Request("http://localhost/get", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    expect(((await res2.json()) as { session: any }).session).toEqual({ user: "bob" });

    // Wait 1.5s
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check after expiration
    const res3 = await app.handle(
      new Request("http://localhost/get", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    expect(((await res3.json()) as { session: any }).session).toBeUndefined();
  });

  test("should use custom encryption/decryption", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });
    const app = new Elysia()
      .use(
        SessionPlugin({
          store,
          scope: "global",
          cookieName: "session",
          encrypt: async (val) => `enc_${val}`,
          decrypt: async (val) => val.replace("enc_", ""),
        }),
      )
      .get("/set", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        const encryptedId = await createOrUpdateSession({
          sessionHandler,
          cookieName: "session",
          cookie,
          session: { user: "bob" },
          cookieOptions: baseCookieOptions,
        });
        return { encryptedId };
      })
      .get("/get", ({ session }) => {
        return { session };
      });

    const res1 = await app.handle(new Request("http://localhost/set"));
    const { encryptedId } = (await res1.json()) as { encryptedId: string };

    // Verify it used our "encryption"
    expect(encryptedId).toStartWith("enc_");

    const res2 = await app.handle(
      new Request("http://localhost/get", {
        headers: { Cookie: `session=${encryptedId}` },
      }),
    );
    expect(((await res2.json()) as { session: any }).session).toEqual({ user: "bob" });
  });

  test("should respect custom cookie options", async () => {
    const store = new SqliteStore<any>({ db, expiresAfter: { minutes: 5 } });
    const app = new Elysia()
      .use(
        SessionPlugin({
          store,
          scope: "global",
          cookieName: "custom-session",
          cookieOptions: {
            path: "/api",
            httpOnly: false,
            secure: false,
            sameSite: "lax",
          },
        }),
      )
      .get("/api/set", async ({ sessionHandler, createOrUpdateSession, cookie }) => {
        await createOrUpdateSession({
          sessionHandler,
          cookieName: "custom-session",
          cookie,
          session: { user: "bob" },
          cookieOptions: {
            path: "/api",
            httpOnly: false,
            secure: false,
            sameSite: "lax",
          },
        });
        return { ok: true };
      });

    const res = await app.handle(new Request("http://localhost/api/set"));
    const setCookie = res.headers.get("Set-Cookie");

    expect(setCookie).toContain("custom-session=");
    expect(setCookie).toContain("Path=/api");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("HttpOnly");
    expect(setCookie).not.toContain("Secure");
  });
});
