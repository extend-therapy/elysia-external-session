import { type Duration } from "date-fns";
export interface SessionOptions {
    cookieName?: string;
    expireAfter?: Duration;
}
export declare abstract class BaseStore<T> {
    protected cookieName: string;
    protected expireAfterSeconds: number;
    createCookieString: (encryptedSessionId: string) => string;
    resetCookie: () => string;
    constructor({ cookieName, expireAfter, }: SessionOptions);
    abstract get<T>({ sessionId }: {
        sessionId: string;
    }): Promise<T | null>;
    abstract set<T>({ sessionId, session, }: {
        sessionId: string;
        session: T;
    }): Promise<void>;
    abstract delete({ sessionId }: {
        sessionId: string;
    }): Promise<boolean>;
}
