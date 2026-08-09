import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MASTER_EMAIL, needsPasswordLock, normalizeEmail } from "@/lib/passwordLock";

const ROOT = path.resolve(__dirname, "../..");

describe("master password lock gate", () => {
  it("cites the gate in App and ships lock migration", () => {
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260808_0092_master_password_lock.sql"),
      "utf8",
    );
    expect(app).toMatch(/needsPasswordLock/);
    expect(app).toMatch(/PasswordLockPage/);
    expect(migration).toMatch(/password_locked_at/);
    expect(migration).toMatch(/lock_account_password/);
  });

  it("only gates the master email until locked", () => {
    expect(normalizeEmail(" AndrewIGuess@Gmail.com ")).toBe(MASTER_EMAIL);
    expect(needsPasswordLock(MASTER_EMAIL, { passwordLockedAt: null })).toBe(true);
    expect(needsPasswordLock(MASTER_EMAIL, { passwordLockedAt: "2026-08-08T00:00:00Z" })).toBe(false);
    expect(needsPasswordLock("other@example.com", { passwordLockedAt: null })).toBe(false);
    expect(needsPasswordLock(MASTER_EMAIL, null)).toBe(false);
  });
});
