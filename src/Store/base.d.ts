import { type Duration } from "date-fns";
type SimpleCookieOptions = {
    path?: string;
    sameSite?: "strict" | "lax" | "none";
    expires?: Duration;
    secure?: boolean;
    httpOnly?: boolean;
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
    /**
     * Flash is a special message that is stored in the session and is deleted after it is read once.
     * Flash is optional to introduce, so these methods have default no-op implementations.
     */
    getFlash({ sessionId }: {
        sessionId: string;
    }): Promise<string | null>;
    setFlash({ sessionId, flash, }: {
        sessionId: string;
        flash: string;
    }): Promise<void>;
}
export {};
