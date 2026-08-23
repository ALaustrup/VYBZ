import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("signed-in password set", () => {
  it("lets a signed-in person set a password from profile settings", () => {
    const card = read("src/components/PasswordCard.tsx");
    expect(card).toContain("setAccountPassword");
    expect(card).toContain("profile-set-password");
    expect(card).toContain("Save password");
    expect(card).toContain("Use at least 8 characters");
    expect(card).not.toMatch(/resetPasswordForEmail|admin\.updateUser|generateLink/);
    const page = read("src/pages/ProfilePage.tsx");
    expect(page).toContain("PasswordCard");
  });
});
