/**
 * Self-serve alpha key gate.
 *
 * The gate is email-tagged, not invite-only: anyone can obtain a key. What must
 * hold is that throttling lives in the database (so it cannot be sidestepped),
 * the key is shown on screen rather than depending on mail delivery, and the copy
 * never claims the address was verified.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isValidEmail, alphaKeyErrorMessage } from "@/features/alpha/alphaKeyRequest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("self-serve alpha key", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("alphaKey");
  });

  it("validates the address before spending a request", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail(" a@b.co ")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(`${"x".repeat(250)}@b.co`)).toBe(false);
  });

  it("explains a throttle in words a visitor can act on", () => {
    expect(alphaKeyErrorMessage("rate_limited_email")).toMatch(/today/i);
    expect(alphaKeyErrorMessage("rate_limited_ip")).toMatch(/connection/i);
    expect(alphaKeyErrorMessage("invalid_email")).toMatch(/email/i);
  });

  it("throttles in the database, not only in the edge function", () => {
    const up = "supabase/migrations/20260815_0097_self_serve_alpha_keys.sql";
    expect(existsSync(path.join(ROOT, up))).toBe(true);
    const sql = read(up);
    expect(sql).toContain("per_email_limit");
    expect(sql).toContain("per_ip_limit");
    expect(sql).toContain("rate_limited_email");
    // Only the newest key per address stays live.
    expect(sql).toMatch(/update public\.invite_keys[\s\S]*?set revoked_at = now\(\)/);
    // Issuing is service-role only; the browser cannot call it directly.
    expect(sql).toContain("grant execute on function public.issue_self_alpha_key(text, text) to service_role");
    expect(sql).toMatch(/revoke all on function public\.issue_self_alpha_key\(text, text\) from public, anon, authenticated/);
    expect(existsSync(path.join(ROOT, "supabase/migrations/20260815_0097_self_serve_alpha_keys.down.sql"))).toBe(true);
  });

  it("binds the key to the address and never stores a raw IP", () => {
    const sql = read("supabase/migrations/20260815_0097_self_serve_alpha_keys.sql");
    expect(sql).toContain("issued_to_email");
    expect(sql).toContain("ip_hash");

    const edge = read("supabase/functions/alpha-key/index.ts");
    expect(edge).toContain("hashIp");
    expect(edge).toContain("crypto.subtle.digest");
    expect(edge).toContain("issue_self_alpha_key");
  });

  it("hands the key back on screen so a mail failure cannot cost access", () => {
    const edge = read("supabase/functions/alpha-key/index.ts");
    // Email send is fire-and-forget; the response still carries the code.
    expect(edge).toContain("void sendKeyEmail");
    expect(edge).toMatch(/return json\(\{ ok: true, code: result\.code/);

    const ui = read("src/features/alpha/AlphaKeyGenerator.tsx");
    expect(ui).toContain("alpha-key-code");
    expect(ui).toContain("alpha-key-copy");
    // Visible copy must not imply an email check that does not happen.
    expect(ui).toContain("We do not check the address");
  });

  it("is reachable both before sign-in and at the gate", () => {
    expect(read("src/pages/LandingPage.tsx")).toContain("AlphaKeyGenerator");
    expect(read("src/features/alpha/InviteRedeemPage.tsx")).toContain("AlphaKeyGenerator");
  });
});
