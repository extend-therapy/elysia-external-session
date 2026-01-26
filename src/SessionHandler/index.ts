import type { Context, Cookie, CookieOptions } from "elysia";
import { SessionPluginError } from "..";
import { Encryption } from "../Encryption";
import type { BaseStore } from "../Store/base";

/**
 * @description SessionConfig is a type that defines the configuration for a session. You can create your own type to pass in.
 * @template T - The type of the session. For example some interaface like: `interface WeakSession { sessionId: string, user: {name: string}, importantInfo: any }`
 * @template U - The type of the store. For example `RedisStore<WeakSession>`
 */
export interface SessionHandlerConfig<T, U extends BaseStore<T> = BaseStore<T>> {
  name?: string;
  seed?: string;
  store: U;
  encrypt?: (value: string) => Promise<string>;
  decrypt?: (value: string) => Promise<string | null>;
  cookieOptions?: CookieOptions;
  cookieName?: string;
  scope: "global" | "scoped";
}

export class SessionHandler<T, U extends BaseStore<T>> {
  protected encryptionHandler:
    | Encryption
    | {
        encrypt: (value: string) => Promise<string>;
        decrypt: (value: string) => Promise<string | null>;
      };
  protected sessionStore: U;

  /**
   * Simplified wrapper for sessionStore.create that creates a uuid and encrypts it and returns it
   * @param session - The session object to create. This is passed in to allow for the session to be created with the sessionId already set.
   * @returns {Promise<string>} The sessionId encrypted
   */
  public createSession: ({ session }: { session: T }) => Promise<string>; // returns sessionId

  /**
   * Wrapper for sessionStore.delete that deletes the session and returns a cookie string
   * @param sessionId - The sessionId to delete
   * @returns A cookie string that clears the session with the cookie name
   */
  public deleteSessionAndClearCookie: (
    sessionId: string,
    cookie: Context["cookie"],
  ) => Promise<string>; // returns cookie string

  // Wrapper for encryptionHandler.decrypt that decrypts the sessionId and returns it
  public getSessionId: (sessionId: string) => Promise<string | null>; // returns sessionId or null

  // from sessionStore
  public getSession: ({ sessionId }: { sessionId: string }) => Promise<T | null>; // returns session or null

  public setSession: ({ sessionId, session }: { sessionId: string; session: T }) => Promise<void>; // returns void

  // generally flash is a string message that is deleted after being read once
  public getFlash?: ({ sessionId }: { sessionId: string }) => Promise<string | null>; // returns flash or null

  // generally flash is a string message that is deleted after being read once
  public setFlash?: ({ sessionId, flash }: { sessionId: string; flash: string }) => Promise<void>; // returns void

  public deleteSession: ({ sessionId }: { sessionId: string }) => Promise<boolean>; // returns true if session was deleted, false if not found

  public getCookieName: () => string;

  // deprecated
  public sessionFromCookie: (cookie?: Record<string, Cookie<unknown>>) => Promise<{
    sessionId?: string;
    session?: T;
  }>;

  public sessionFromCookieString: (cookieString?: string) => Promise<{
    sessionId?: string;
    session?: T;
  }>;

  public encrypt: (input: string) => Promise<string>;
  // public decrypt: (sessionId: string) => Promise<string | null>;

  /**
   * Wrapper for sessionStore.createCookieString that creates a cookie string
   * @param sessionId {string} - The sessionId to create a cookie string for
   * @returns {string} A cookie string that sets the sessionId
   */
  public createCookieString: (sessionId: string) => string;

  constructor(private config: SessionHandlerConfig<T, U>) {
    const { encrypt, decrypt } = config;
    if (encrypt && decrypt) {
      this.encryptionHandler = { encrypt, decrypt };
    } else {
      this.encryptionHandler = new Encryption();
    }
    if (!this.encryptionHandler) {
      throw new SessionPluginError("Encryption is not set");
    }
    this.encrypt = this.encryptionHandler.encrypt.bind(this.encryptionHandler);
    this.sessionStore = config.store;
    this.getCookieName = this.sessionStore.getCookieName.bind(this.sessionStore);
    this.getSession = this.sessionStore.get.bind(this.sessionStore);
    this.setSession = this.sessionStore.set.bind(this.sessionStore);
    this.getFlash = this.sessionStore.getFlash?.bind(this.sessionStore);
    this.setFlash = this.sessionStore.setFlash?.bind(this.sessionStore);
    this.deleteSession = this.sessionStore.delete.bind(this.sessionStore);
    this.createSession = async ({ session }: { session: T }) => {
      const sessionId = Bun.randomUUIDv7();
      const encryptedSessionId = await this.encryptionHandler.encrypt(sessionId);
      await this.sessionStore.set({ sessionId, session });
      return encryptedSessionId;
    };
    this.deleteSessionAndClearCookie = async (sessionId: string, cookie: Context["cookie"]) => {
      await this.deleteSession({ sessionId });
      const resetCookie = this.sessionStore.resetCookie();
      const cookieName = this.getCookieName();
      if (cookie && cookie[cookieName]) {
        cookie[cookieName]!.remove();
      }
      return resetCookie;
    };
    this.getSessionId = async (sessionId: string) => {
      return this.encryptionHandler.decrypt(sessionId);
    };

    this.createCookieString = this.sessionStore.createCookieString.bind(this.sessionStore);

    /**
     * @deprecated Use sessionFromCookieString instead
     */
    this.sessionFromCookie = async (
      cookie?: Record<string, Cookie<unknown>>,
    ): Promise<{
      sessionId?: string;
      session?: T;
    }> => {
      if (!cookie) {
        return {};
      }

      const name = this.getCookieName();

      const sessionCookie = cookie[name]?.value as string;
      if (!sessionCookie) {
        return {};
      }
      const sessionId = await this.getSessionId(sessionCookie);
      if (!sessionId) {
        return {};
      }
      return {
        sessionId,
        session: (await this.getSession({ sessionId })) ?? undefined,
      };
    };

    /**
     * @param cookieString The encrypted session id (from value of cookie)
     * @returns The session id and session if found or empty object
     */
    this.sessionFromCookieString = async (
      cookieString?: string,
    ): Promise<{
      sessionId?: string;
      session?: T;
    }> => {
      if (!cookieString) {
        return {};
      }
      const sessionId = await this.getSessionId(cookieString);
      if (!sessionId) {
        return {};
      }
      return {
        sessionId,
        session: (await this.getSession({ sessionId })) ?? undefined,
      };
    };
  }
}
