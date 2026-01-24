import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SqliteStore } from "../../src/Store/sqlite";

describe("SqliteStore", () => {
  let db: Database;
  let store: SqliteStore<any>;

  beforeEach(() => {
    db = new Database(":memory:");
    // Create the table as expected by the store
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        session TEXT,
        expires_at INTEGER
      )
    `);
    store = new SqliteStore({ 
      db, 
      expiresAfter: { minutes: 1 } 
    });
  });

  afterEach(() => {
    db.close();
  });

  test("should set and get session data", async () => {
    const sessionId = "test-session-id";
    const sessionData = { user: "alice" };

    await store.set({ sessionId, session: sessionData });
    const retrieved = await store.get({ sessionId });

    expect(retrieved).toEqual(sessionData);
  });

  test("should return null for non-existent session", async () => {
    const retrieved = await store.get({ sessionId: "missing" });
    expect(retrieved).toBeNull();
  });

  test("should delete session", async () => {
    const sessionId = "delete-me";
    await store.set({ sessionId, session: { data: 123 } });
    
    const deleted = await store.delete({ sessionId });
    expect(deleted).toBe(true);

    const retrieved = await store.get({ sessionId });
    expect(retrieved).toBeNull();
  });

  test("should handle expired sessions", async () => {
    const sessionId = "expire-me";
    // Set store with very short expiration
    const shortStore = new SqliteStore({
      db,
      expiresAfter: { seconds: -1 } // Already expired
    });

    await shortStore.set({ sessionId, session: { val: "old" } });
    const retrieved = await shortStore.get({ sessionId });

    expect(retrieved).toBeNull();
  });
});
