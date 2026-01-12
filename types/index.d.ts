import { Elysia } from "elysia";
import type { BaseStore } from "./Store/base";
import { SessionHandler, type SessionHandlerConfig } from "./SessionHandler";
export { type SessionHandlerConfig } from "./SessionHandler";
export { SessionHandler } from "./SessionHandler";
export { BaseStore, type SessionOptions } from "./Store/base";
export { RedisStore, type RedisStoreOptions } from "./Store/redis";
export { BunRedisStore, type BunRedisStoreOptions } from "./Store/bunredis";
export { SqliteStore, type SqliteStoreOptions } from "./Store/sqlite";
export declare class SessionPluginError extends Error {
    readonly name = "SessionPluginError";
    constructor(message: string, cause?: Error);
}
declare function SessionPlugin<T, U extends BaseStore<T>>(config: SessionHandlerConfig<T, U>, mockSession?: T): Elysia<"", {
    decorator: {
        sessionHandler: SessionHandler<T, U>;
    };
    store: {};
    derive: {};
    resolve: {
        sessionId: string | null | undefined;
        session: T | null;
    } | {
        readonly sessionId: string;
        readonly session: NonNullable<T>;
    };
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export default SessionPlugin;
