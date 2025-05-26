import { addMilliseconds, formatISO } from "date-fns";
export interface SessionOptions {
  cookieName?: string;
  expireAfter?: number;
}

export abstract class BaseStore<T> {
  protected cookieName: string;
  protected expireAfter: number;
  public createCookieString: (encryptedSessionId: string) => string;
  public resetCookie: () => string;

  constructor({
    cookieName = "session",
    expireAfter = 1000 * 60 * 60 * 24 * 30,
  }: SessionOptions) {
    this.cookieName = cookieName ?? "session";
    this.expireAfter = expireAfter ?? 1000 * 60 * 60 * 24 * 30; // cookie expiration time in milliseconds
    this.createCookieString = (encryptedSessionId: string) =>
      `${
        this.cookieName
      }=${encryptedSessionId}; Path=/; HttpOnly; SameSite=Strict; Expires=${addMilliseconds(
        new Date(),
        this.expireAfter
      ).toUTCString()}`;
    this.resetCookie = () =>
      `${
        this.cookieName
      }=; Path=/; HttpOnly; SameSite=Strict; Expires=${formatISO(new Date(0))}`;
  }

  async create({
    session,
    sessionId,
  }: {
    session: T;
    sessionId: string;
  }): Promise<void> {
    await this.set({ sessionId, session });
  }

  abstract get<T>({ sessionId }: { sessionId: string }): Promise<T | null>;

  abstract set<T>({
    sessionId,
    session,
  }: {
    sessionId?: string;
    session: T;
  }): Promise<void>;

  abstract delete({ sessionId }: { sessionId: string }): Promise<boolean>;
}
