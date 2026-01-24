import { durationToSeconds } from "@/helpers/durationToSeconds";
import { Database } from "bun:sqlite";
import type { Duration } from "date-fns";
import { BaseStore, type SessionOptions } from "./base";

export interface SqliteStoreOptions extends SessionOptions {
  dbPath?: string; // ":memory:" or a file
  expiresAfter?: Duration;
  db?: Database;
}

class SessionResponse {
  session: string;
  expires_at: number;
  constructor(session: string, expires_at: number) {
    this.session = session;
    this.expires_at = expires_at;
  }
}

export class SqliteStore<T> extends BaseStore<T> {
  private db: Database;
  private expiresAfterSeconds: number;

  constructor(options: SqliteStoreOptions) {
    super(options);
    if (options.dbPath && !options.db) {
      console.log("Using SQLite database at:", options.dbPath);
      this.db = new Database(options.dbPath);
    } else if (options.db) {
      this.db = options.db;
    } else {
      this.db = new Database(":memory:");
    }

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    this.expiresAfterSeconds = durationToSeconds({
      duration: options.expiresAfter,
    });

    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        session TEXT,
        expires_at INTEGER
      )
    `);
  }

  async get({ sessionId }: { sessionId: string }) {
    const query = this.db
      .query("SELECT session, expires_at FROM sessions WHERE session_id = ?")
      .as(SessionResponse);
    const sessionResponse = query.get(sessionId);
    if (sessionResponse) {
      const now = new Date().getTime();
      if (sessionResponse.expires_at < now) {
        this.db
          .prepare("DELETE FROM sessions WHERE session_id = ?")
          .run(sessionId);
        return null;
      }
      const session = JSON.parse(sessionResponse.session) as T;
      this.db
        .prepare("UPDATE sessions SET expires_at = ? WHERE session_id = ?")
        .run(now + this.expiresAfterSeconds * 1000, sessionId);
      return session;
    }
    return null;
  }

  async set({ sessionId, session }: { sessionId: string; session: T }) {
    const sessionString = JSON.stringify(session);
    if (!sessionString) {
      return;
    }
    const now = new Date().getTime();
    this.db
      .prepare(
        "INSERT OR REPLACE INTO sessions (session_id, session, expires_at) VALUES (?, ?, ?)"
      )
      .run(sessionId, sessionString, now + this.expiresAfterSeconds * 1000);
  }

  async delete({ sessionId }: { sessionId: string }) {
    const result = this.db
      .prepare("DELETE FROM sessions WHERE session_id = ?")
      .run(sessionId);
    return result.changes > 0;
  }
}
