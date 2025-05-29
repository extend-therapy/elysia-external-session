import { durationToSeconds } from "@/helpers/durationToSeconds";
import { addSeconds, formatISO, type Duration } from "date-fns";
export interface SessionOptions {
  cookieName?: string;
  expireAfter?: Duration;
}

export abstract class BaseStore<T> {
  protected cookieName: string;
  protected expireAfterSeconds: number;
  public createCookieString: (encryptedSessionId: string) => string;
  public resetCookie: () => string;

  constructor({
    cookieName = "session",
    expireAfter = { hours: 5 },
  }: SessionOptions) {
    this.cookieName = cookieName ?? "session";
    this.expireAfterSeconds = durationToSeconds({ duration: expireAfter });
    this.createCookieString = (encryptedSessionId: string) =>
      `${
        this.cookieName
      }=${encryptedSessionId}; Path=/; SameSite=Strict; Expires=${addSeconds(
        new Date(),
        this.expireAfterSeconds
      ).toUTCString()}`;
    this.resetCookie = () =>
      `${this.cookieName}=; Path=/; SameSite=Strict; Expires=${formatISO(
        new Date(0)
      )}`;
  }

  // Gets the session data
  abstract get<T>({ sessionId }: { sessionId: string }): Promise<T | null>;

  // Sets or creates the session data. SessionHandler has a wrapper for this for createSession that also creates a sessionId
  abstract set<T>({
    sessionId,
    session,
  }: {
    sessionId?: string;
    session: T;
  }): Promise<void>;

  // Deletes the session data returns true if session was deleted, false if not found
  abstract delete({ sessionId }: { sessionId: string }): Promise<boolean>;
}
