import { durationToSeconds } from "@/helpers/durationToSeconds";
import { addSeconds, formatISO, type Duration } from "date-fns";

type SimpleCookieOptions = {
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  expires?: Duration;
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
      }; SameSite=${this.cookieOptions.sameSite}; Expires=${addSeconds(
        new Date(),
        durationToSeconds({ duration: this.cookieOptions.expires })
      ).toUTCString()}`;
    this.resetCookie = () =>
      `${this.cookieName}=; Path=${this.cookieOptions.path}; SameSite=${
        this.cookieOptions.sameSite
      }; Expires=${new Date(0).toUTCString()}`;
  }

  // Gets the session data
  abstract get<T>({ sessionId }: { sessionId: string }): Promise<T | null>;

  // Sets or creates the session data. SessionHandler has a wrapper for this for createSession that also creates a sessionId
  abstract set<T>({
    sessionId,
    session,
  }: {
    sessionId: string;
    session: T;
  }): Promise<void>;

  // Deletes the session data returns true if session was deleted, false if not found
  abstract delete({ sessionId }: { sessionId: string }): Promise<boolean>;
}
