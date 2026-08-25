/**
 * Reads one cookie value straight out of a `Cookie` request header.
 *
 * Elysia's cookie jar (`ctx.cookie`) is not populated until after validation, but
 * the session has to be resolved *before* validation so that auth guards can run
 * first — otherwise an unauthenticated request is validated and answered 422,
 * disclosing schema details, before anything checks who is calling. Parsing the
 * raw header is the only way to reach the value that early.
 *
 * Deliberately minimal: cookie values are opaque here (an encrypted session id),
 * so this splits on the first `=` only and leaves the value untouched apart from
 * URI decoding, which is what set the value in the first place.
 */
export const readRawCookie = (header: string | null | undefined, name: string): string | undefined => {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      // A malformed percent-escape is a tampered or truncated cookie; hand back
      // the raw value and let decryption reject it rather than throwing here,
      // which would 500 a request that should simply be unauthenticated.
      return raw;
    }
  }
  return undefined;
};
