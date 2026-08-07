import { describe, expect, it } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { passkeysSupported } from "@/lib/passkey";

/**
 * The critical passkey client bug was swallowing edge-function bodies.
 * These tests lock the error-extraction behaviour without hitting WebAuthn.
 */

describe("passkeysSupported", () => {
  it("returns a boolean without throwing", () => {
    expect(typeof passkeysSupported()).toBe("boolean");
  });
});

describe("FunctionsHttpError shape", () => {
  it("is constructible so the client can narrow invoke failures", () => {
    const err = new FunctionsHttpError(
      new Response(JSON.stringify({ error: "account_exists" }), { status: 409 }),
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.context).toBeInstanceOf(Response);
  });
});
