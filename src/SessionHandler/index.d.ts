import type { Cookie } from "elysia";
import { Encryption } from "../Encryption";
import type { BaseStore } from "../Store/base";
/**
 * @description SessionConfig is a type that defines the configuration for a session. You can create your own type to pass in.
 * @template T - The type of the session. For example some interaface like: `interface WeakSession { sessionId: string, user: {name: string}, importantInfo: any }`
 * @template U - The type of the store. For example `RedisStore<WeakSession>`
 */
export interface SessionHandlerConfig<T, U extends BaseStore<T> = BaseStore<T>> {
    name?: string;
    store: U;
    encrypt?: (value: string) => Promise<string>;
    decrypt?: (value: string) => Promise<string | null>;
}
export declare class SessionHandler<T, U extends BaseStore<T>> {
    private config;
    protected encryptionHandler: Encryption | {
        encrypt: (value: string) => Promise<string>;
        decrypt: (value: string) => Promise<string | null>;
    };
    protected sessionStore: U;
    /**
     * Simplified wrapper for sessionStore.create that creates a uuid and encrypts it and returns it
     * @param session - The session object to create. This is passed in to allow for the session to be created with the sessionId already set.
     * @returns {Promise<string>} The sessionId encrypted
     */
    createSession: ({ session }: {
        session: T;
    }) => Promise<string>;
    /**
     * Wrapper for sessionStore.delete that deletes the session and returns a cookie string
     * @param sessionId - The sessionId to delete
     * @returns A cookie string that clears the session with the cookie name
     */
    deleteSessionAndClearCookie: (sessionId: string) => Promise<string>;
    getSessionId: (sessionId: string) => Promise<string | null>;
    getSession: ({ sessionId, }: {
        sessionId: string;
    }) => Promise<T | null>;
    setSession: ({ sessionId, session, }: {
        sessionId: string;
        session: T;
    }) => Promise<void>;
    deleteSession: ({ sessionId, }: {
        sessionId: string;
    }) => Promise<boolean>;
    sessionFromCookie: (cookie?: Record<string, Cookie<string | undefined>>, name?: string) => Promise<{
        sessionId?: string;
        session?: T;
    }>;
    encrypt: (input: string) => Promise<string>;
    /**
     * Wrapper for sessionStore.createCookieString that creates a cookie string
     * @param sessionId {string} - The sessionId to create a cookie string for
     * @returns {string} A cookie string that sets the sessionId
     */
    createCookieString: (sessionId: string) => string;
    constructor(config: SessionHandlerConfig<T, U>);
}
