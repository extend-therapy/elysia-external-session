import type { Cookie } from "elysia";
import type { SessionHandler } from "../SessionHandler";
import { BaseStore } from "../Store";

export async function cookieResolver<T, U extends BaseStore<T>>({
  cookie,
  sessionHandler,
  mergedConfig,
}: {
  cookie: { [key: string]: Cookie<unknown> };
  sessionHandler: SessionHandler<T, U>;
  mergedConfig: any;
}) {
  const cookieString = cookie[mergedConfig.cookieName]?.value as string | undefined;
  const { sessionId, session } = await sessionHandler.sessionFromCookieString(cookieString);

  return {
    sessionId,
    session,
  };
}
