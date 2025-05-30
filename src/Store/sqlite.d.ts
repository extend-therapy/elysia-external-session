import type { Duration } from "date-fns";
import { BaseStore, type SessionOptions } from "./base";
import { Database } from "bun:sqlite";
export interface SqliteStoreOptions extends SessionOptions {
    dbPath?: string;
    expireAfter?: Duration;
    db?: Database;
}
export declare class SqliteStore<T> extends BaseStore<T> {
    private db;
    private expireAfterSeconds;
    constructor(options: SqliteStoreOptions);
    get<T>({ sessionId }: {
        sessionId: string;
    }): Promise<T | null>;
    set<T>({ sessionId, session }: {
        sessionId: string;
        session: T;
    }): Promise<void>;
    delete({ sessionId }: {
        sessionId: string;
    }): Promise<boolean>;
}
