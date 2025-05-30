import { type Duration } from "date-fns";
type SimpleCookieOptions = {
    path?: string;
    sameSite?: "strict" | "lax" | "none";
    expires?: Duration;
};
export interface SessionOptions {
    cookieName?: string;
    cookieOptions?: SimpleCookieOptions;
}
export declare abstract class BaseStore<T> {
    protected cookieName: string;
    protected cookieOptions: SimpleCookieOptions;
    createCookieString: (encryptedSessionId: string) => string;
    resetCookie: () => string;
    getCookieName: () => string;
    getCookieOptions: () => SimpleCookieOptions;
    constructor(options: SessionOptions);
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
export {};
