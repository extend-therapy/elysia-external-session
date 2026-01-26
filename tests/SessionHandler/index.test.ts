import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { Context } from "elysia";
import { SessionHandler } from "../../src/SessionHandler";
import { SqliteStore } from "../../src/Store/sqlite";

describe("SessionHandler", () => {
  let db: Database;
  let store: SqliteStore<any>;
  let handler: SessionHandler<any, any>;
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE sessions (session_id TEXT PRIMARY KEY, session TEXT, expires_at INTEGER)`);
    store = new SqliteStore({ db, expiresAfter: { hours: 1 } });

    // Mocking environment variable for Encryption
    process.env.ENCRYPTION_KEY = testKey;

    handler = new SessionHandler({
      store,
      name: "test-session-plugin",
      scope: "global",
    });
  });

  test("should create a session and return encrypted sessionId", async () => {
    const sessionData = { userId: 123 };
    const encryptedId = await handler.createSession({ session: sessionData });

    expect(typeof encryptedId).toBe("string");
    expect(encryptedId.length).toBeGreaterThan(0);

    const decryptedId = await handler.getSessionId(encryptedId);
    expect(decryptedId).toBeDefined();

    const retrieved = await handler.getSession({ sessionId: decryptedId! });
    expect(retrieved).toEqual(sessionData);
  });

  test("should delete a session and return clear cookie string", async () => {
    const encryptedId = await handler.createSession({ session: { a: 1 } });
    const decryptedId = (await handler.getSessionId(encryptedId))!;

    const cookieString = await handler.deleteSessionAndClearCookie(
      decryptedId,
      {} as Context["cookie"],
    );
    expect(cookieString).toContain("Expires=Thu, 01 Jan 1970");

    const retrieved = await handler.getSession({ sessionId: decryptedId });
    expect(retrieved).toBeNull();
  });

  test("should generate correct cookie string", () => {
    const cookieString = handler.createCookieString("some-encrypted-id");
    expect(cookieString).toContain("session=some-encrypted-id");
    expect(cookieString).toContain("Path=undefined");
  });
});
