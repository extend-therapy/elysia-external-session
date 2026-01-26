import { addSeconds, type Duration } from "date-fns";
import { durationToSeconds } from "../helpers/durationToSeconds";

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

export abstract class BaseStore<T> {
  protected cookieName: string;
  protected cookieOptions: SimpleCookieOptions;
  public createCookieString: (encryptedSessionId: string) => string;
  public resetCookie: () => string;
  public getCookieName: () => string;
  public getCookieOptions: () => SimpleCookieOptions;

  constructor(options: SessionOptions) {
    this.cookieName = options.cookieName ?? "session";
    this.getCookieName = () => this.cookieName;
    this.cookieOptions = {
      path: options.cookieOptions?.path,
      sameSite: options.cookieOptions?.sameSite,
      expires: options.cookieOptions?.expires,
    };
    this.getCookieOptions = () => this.cookieOptions;
    this.createCookieString = (encryptedSessionId: string) =>
      `${this.cookieName}=${encryptedSessionId}; Path=${
        this.cookieOptions.path
      }; SameSite=${this.cookieOptions.sameSite}; Secure=${!!this.cookieOptions
        .secure}; HttpOnly=${!!this.cookieOptions.httpOnly}; Expires=${addSeconds(
        new Date(),
        durationToSeconds({ duration: this.cookieOptions.expires }),
      ).toUTCString()}`;
    this.resetCookie = () =>
      `${this.cookieName}=; Path=${this.cookieOptions.path}; SameSite=${
        this.cookieOptions.sameSite
      }; Expires=${new Date(0).toUTCString()}`;
  }

  // Gets the session data
  abstract get({ sessionId }: { sessionId: string }): Promise<T | null>;

  // Sets or creates the session data. SessionHandler has a wrapper for this for createSession that also creates a sessionId
  abstract set({ sessionId, session }: { sessionId: string; session: T }): Promise<void>;

  // Deletes the session data returns true if session was deleted, false if not found
  abstract delete({ sessionId }: { sessionId: string }): Promise<boolean>;

  /**
   * Flash is a special message that is stored in the session and is deleted after it is read once.
   * Flash is optional to introduce, so these methods have default no-op implementations.
   */
  // Gets Flash from the session (and deletes it)
  async getFlash({ sessionId }: { sessionId: string }): Promise<string | null> {
    const gSession = (await this.get({ sessionId })) as
      | (T & {
          flash?: string;
        })
      | null;
    if (gSession && gSession.flash) {
      const { flash, ...sessionWithoutFlash } = gSession;
      await this.set({ sessionId, session: sessionWithoutFlash as T });
      return flash;
    }
    return null;
  }

  // Sets flash for the session
  async setFlash({ sessionId, flash }: { sessionId: string; flash: string }): Promise<void> {
    const gSession =
      ((await this.get({ sessionId })) as T & { flash?: string }) || ({} as T & { flash?: string });
    gSession.flash = flash;
    await this.set({ sessionId, session: gSession as T });
  }
}
