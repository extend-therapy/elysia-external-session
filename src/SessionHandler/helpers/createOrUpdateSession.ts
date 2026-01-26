import { Context, Cookie, CookieOptions } from "elysia";
import { SessionHandler } from "..";
import { BaseStore } from "../../Store";

export async function createOrUpdateSession<T, U extends BaseStore<T>>({
  sessionHandler,
  session,
  sessionId,
  cookieName,
  cookie,
  cookieOptions,
}: {
  cookie: Context["cookie"];
  sessionHandler: SessionHandler<T, U>;
  session: T;
  sessionId?: string;
  cookieName: string;
  cookieOptions: CookieOptions;
}): Promise<string> {
  if (!sessionId) {
    const sessionId = await sessionHandler.createSession({ session });
    const c = cookie[cookieName] as Cookie<string>;
    if (cookieOptions) {
      Object.assign(c, cookieOptions);
    }
    c.value = sessionId;
    return sessionId;
  } else {
    await sessionHandler.setSession({ sessionId, session });
    return sessionId;
  }
}
