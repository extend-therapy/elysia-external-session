import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import SessionPlugin from "../src";
import { SqliteStore } from "../src/Store/sqlite";

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
      .use(SessionPlugin({
        store,
        name: "test-plugin"
      }))
      .get("/set", async ({ sessionHandler }) => {
        const encryptedId = await sessionHandler.createSession({ session: { user: "bob" } });
        return { encryptedId };
      })
      .get("/get", ({ session, sessionId }) => {
        return { session, sessionId };
      });

    // 1. Create session
    const resSet = await app.handle(new Request("http://localhost/set"));
    const { encryptedId } = await resSet.json();
    
    expect(encryptedId).toBeDefined();
    // In current implementation, onAfterHandle sets the cookie if session and sessionId are present in context
    // However, /set doesn't return them in context, it just creates them via handler.
    // Let's test a route that uses the session.

    const appWithSession = new Elysia()
      .use(SessionPlugin({ store }))
      .get("/profile", ({ session, sessionId }) => {
        return { session, sessionId };
      });

    const resGet = await appWithSession.handle(new Request("http://localhost/profile", {
        headers: {
            Cookie: `session=${encryptedId}`
        }
    }));

    const data = await resGet.json();
    expect(data.session).toEqual({ user: "bob" });
    expect(data.sessionId).toBeDefined();
  });
});
