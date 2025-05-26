import Elysia from "elysia";

export const moduleRouter = new Elysia().get("/module", (ctx: any) => {
  return {
    ctxSessionId: ctx.sessionId ?? "no session id",
    ctxSession: ctx.session ?? "no session",
  };
});
