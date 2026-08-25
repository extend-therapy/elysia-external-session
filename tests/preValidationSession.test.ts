import { Elysia } from "elysia";
import { Type } from "typebox";
import { beforeAll, describe, expect, it } from "bun:test";
import SessionPlugin, { SqliteStore } from "../src";

process.env.ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Elysia 2.0 runs `derive` post-validation, so a session resolved only there
 * arrives after body validation: an unauthenticated request is answered 422,
 * disclosing schema details, before anything checks who is calling. The plugin
 * resolves in a global-scope `transform` and writes `session` onto the context
 * there, restoring the 1.x ordering.
 *
 * The discriminating case is the authenticated one. A guard that only ever sees
 * an unresolved session rejects everything, so "unauthenticated gets 401" passes
 * just as well when the session is never resolved early — it proves throwing
 * beats validation, not that the session was ready. Sending a real cookie and
 * expecting the request to reach validation is what pins the ordering.
 */
type Sess = { user?: string };

const COOKIE_NAME = "s";

// One store instance shared by the mint route and the guarded route: an in-memory
// sqlite store is per-instance, so a second one would not see the session and the
// test would quietly measure the unauthenticated path instead.
const store = new SqliteStore<Sess>({
  cookieName: COOKIE_NAME,
  dbPath: ":memory:",
  expiresAfter: { minutes: 5 },
});

const app = new Elysia()
  .use(SessionPlugin<Sess, typeof store>({ name: COOKIE_NAME, store, scope: "global" }))
  .post("/mint", async (ctx: any) => ({
    cookie: ctx.sessionHandler.createCookieString(
      await ctx.sessionHandler.createSession({ session: { user: "alice" } }),
    ),
  }))
  .guard({}, guarded =>
    guarded
      // Pre-validation guard, the thing this test exists for.
      .transform((ctx: any) => {
        if (!ctx.session?.user) {
          throw Object.assign(new Error("Unauthorized"), { isAuth: true });
        }
      })
      .post("/t", { body: Type.Object({ needed: Type.String() }) }, () => ({ ok: true })),
  )
  .error(({ error }: any) =>
    error?.isAuth
      ? new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
      : undefined,
  );

let cookieHeader = "";

beforeAll(async () => {
  const res = await app.handle(new Request("http://localhost/mint", { method: "POST" }));
  cookieHeader = ((await res.json()) as { cookie: string }).cookie.split(";")[0]!;
});

const post = (body: unknown, cookie?: string) =>
  app.handle(
    new Request("http://localhost/t", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe("session is resolved before validation", () => {
  it("rejects an unauthenticated request with 401 rather than leaking a 422", async () => {
    const res = await post({ wrong: 1 });

    expect(res.status).toBe(401);
  });

  it("lets an authenticated request reach validation, proving the session resolved first", async () => {
    // Load-bearing. 422 means the guard read a real `ctx.session.user` before
    // validation ran and declined to throw; 401 would mean the session was still
    // unresolved and the guard rejected a legitimately signed-in caller.
    const res = await post({ wrong: 1 }, cookieHeader);

    expect(res.status).toBe(422);
  });

  it("serves an authenticated request with a valid body", async () => {
    const res = await post({ needed: "yes" }, cookieHeader);

    expect(res.status).toBe(200);
  });
});
