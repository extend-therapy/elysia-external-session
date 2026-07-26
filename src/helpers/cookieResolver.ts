import type { Cookie } from "elysia";
import type { SessionHandler } from "../SessionHandler";
import { BaseStore } from "../Store";

export async function cookieResolver<T, U extends BaseStore<T>>({
  cookie,
  sessionHandler,
}: {
  cookie: { [key: string]: Cookie<unknown> };
  sessionHandler: SessionHandler<T, U>;
}) {
  const cookieName = sessionHandler.getCookieName();
  const cookieString = cookie[cookieName]?.value as string | undefined;
  const { sessionId, session } = await sessionHandler.sessionFromCookieString(cookieString);

  // The browser sent a session cookie that didn't yield a session id at all,
  // which (given getSessionId only returns null on a decryption failure) means
  // the value can never be decrypted by this instance — a different or rotated
  // ENCRYPTION_KEY, or a tampered value. Clear it so the browser stops sending
  // it and the client is genuinely logged out, rather than looking signed in
  // locally while every request is rejected.
  //
  // Deliberately NOT cleared when the id decrypts but the store has no session
  // (ordinary expiry/eviction): that path still yields a sessionId, and a
  // request that goes on to create a session sets its own cookie — removing it
  // here would race that Set-Cookie.
  const sessionInvalidated = Boolean(cookieString) && !sessionId;
  if (sessionInvalidated) {
    cookie[cookieName]?.remove();
  }

  return {
    sessionId,
    session,
    /** True when a present-but-undecryptable cookie was just cleared. */
    sessionInvalidated,
  };
}
