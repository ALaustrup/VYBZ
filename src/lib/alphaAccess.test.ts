import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasAlphaAccess, normalizeInviteCode, redeemInviteErrorMessage } from "@/lib/alphaAccess";

const ROOT = path.resolve(__dirname, "../..");

/**
 * OR-023 exit gate — invite-only alpha hard gate.
 * Gate: Signed-in non-admin users without alpha_access_at cannot enter the
 * suite shell; they redeem via InviteRedeemPage. Admins bypass. Codes hashed at rest.
 */
describe("OR-023 alpha invite gate", () => {
  it("cites the gate in App and ships hashed invite migration", () => {
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260808_0091_alpha_invite_keys.sql"),
      "utf8",
    );
    expect(app).toMatch(/hasAlphaAccess/);
    expect(app).toMatch(/InviteRedeemPage/);
    expect(migration).toMatch(/alpha_access_at/);
    expect(migration).toMatch(/code_hash/);
    expect(migration).toMatch(/redeem_invite_key/);
    expect(migration).toMatch(/mint_invite_keys/);
  });

  it("grants access for alpha timestamp or admin", () => {
    expect(hasAlphaAccess({ alphaAccessAt: "2026-08-08T00:00:00Z", isAdmin: false, platformRole: "member" })).toBe(true);
    expect(hasAlphaAccess({ alphaAccessAt: null, isAdmin: true, platformRole: "member" })).toBe(true);
    expect(hasAlphaAccess({ alphaAccessAt: null, isAdmin: false, platformRole: "admin" })).toBe(true);
    expect(hasAlphaAccess({ alphaAccessAt: null, isAdmin: false, platformRole: "member" })).toBe(false);
    expect(hasAlphaAccess(null)).toBe(false);
  });

  it("normalizes invite codes and maps redeem errors", () => {
    expect(normalizeInviteCode("  vybz-a1-fb01-abcd1234  ")).toBe("VYBZ-A1-FB01-ABCD1234");
    expect(redeemInviteErrorMessage("expired")).toMatch(/expired/i);
    expect(redeemInviteErrorMessage("already_used")).toMatch(/already been used/i);
  });

  it("signed-out landing is invite-key gate without marketing manifesto", () => {
    const landing = readFileSync(path.join(ROOT, "src/pages/LandingPage.tsx"), "utf8");
    expect(landing).toMatch(/landing-invite-gate/);
    expect(landing).toMatch(/stashPendingInviteKey/);
    expect(landing).not.toMatch(/Your music deserves the truth/);
    expect(landing).not.toMatch(/Scan my track/);
  });
});
