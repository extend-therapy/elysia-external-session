import { Encryption } from "../../Encryption";
import type { BaseStore } from "../Store/base";

export interface BaseSession {
  shouldSetCookie?: boolean;
}

/**
 * @description SessionConfig is a type that defines the configuration for a session. You can create your own type to pass in.
 * @template T - The type of the session. For example some interaface like: `interface WeakSession extends BaseSession { sessionId: string, user: {name: string}, importantInfo: any }`
 * @template U - The type of the store. For example `RedisStore<WeakSession>`
 */
export interface SessionHandlerConfig<
  T extends BaseSession = BaseSession,
  U extends BaseStore<T> = BaseStore<T>
> {
  name?: string;
  store: U;
  encrypt?: (value: string) => Promise<string>;
  decrypt?: (value: string) => Promise<string | null>;
}

export class SessionHandler<T extends BaseSession, U extends BaseStore<T>> {
  protected encryptionHandler:
    | Encryption
    | {
        encrypt: (value: string) => Promise<string>;
        decrypt: (value: string) => Promise<string | null>;
      };
  protected sessionStore: U;

  // Simplified wrapper for sessionStore.create that creates a uuid and encrypts it and returns it
  public createSession: (session: T) => Promise<string>; // returns sessionId

  // Wrapper for encryptionHandler.decrypt that decrypts the sessionId and returns it
  public getSessionId: (sessionId: string) => Promise<string | null>; // returns sessionId or null

  // from sessionStore
  public getSession: ({
    sessionId,
  }: {
    sessionId: string;
  }) => Promise<T | null>; // returns session or null
  public setSession: ({
    sessionId,
    session,
  }: {
    sessionId: string;
    session: T;
  }) => Promise<void>; // returns void
  public deleteSession: ({
    sessionId,
  }: {
    sessionId: string;
  }) => Promise<boolean>; // returns true if session was deleted, false if not found

  // from session
  public createCookieString: (sessionId: string) => string;

  constructor(private config: SessionHandlerConfig<T, U>) {
    const { encrypt, decrypt } = config;
    if (encrypt && decrypt) {
      this.encryptionHandler = { encrypt, decrypt };
    } else {
      this.encryptionHandler = new Encryption();
    }
    if (!this.encryptionHandler) {
      throw new Error("Encryption is not set");
    }
    this.sessionStore = config.store;
    this.getSession = this.sessionStore.get.bind(this.sessionStore);
    this.setSession = this.sessionStore.set.bind(this.sessionStore);
    this.deleteSession = this.sessionStore.delete.bind(this.sessionStore);
    this.createSession = async (session: T) => {
      const sessionId = Bun.randomUUIDv7();
      const encryptedSessionId = await this.encryptionHandler.encrypt(
        sessionId
      );
      await this.sessionStore.create({ sessionId, session });
      return encryptedSessionId;
    };
    this.getSessionId = async (sessionId: string) => {
      return this.encryptionHandler.decrypt(sessionId);
    };
    this.createCookieString = this.sessionStore.createCookieString.bind(
      this.sessionStore
    );
  }
}
