/**
 * Account menu gate.
 *
 * Sign-out existed in `ProfileMenu` and `OrbMenu`, but neither was mounted, so a
 * signed-in user had no way to leave the app. Reachability is the point of this
 * gate: a control that exists in the tree but not on screen does not exist.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("account menu", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("accountMenu");
  });

  it("is mounted in the drawer, not merely defined", () => {
    const chrome = read("src/components/shell/DrawerChrome.tsx");
    expect(chrome).toContain("<AccountMenu />");
    expect(chrome).toContain("@/components/shell/AccountMenu");
    expect(read("src/components/shell/ContextualAppBar.tsx")).not.toContain("<AccountMenu />");
  });

  it("offers a sign out that actually signs out", () => {
    const menu = read("src/components/shell/AccountMenu.tsx");
    expect(menu).toContain("account-sign-out");
    expect(menu).toContain("void signOut()");
    expect(menu).toContain("useSession");
  });

  it("closes on outside click, Escape and navigation", () => {
    const menu = read("src/components/shell/AccountMenu.tsx");
    expect(menu).toContain('e.key === "Escape"');
    expect(menu).toContain("mousedown");
    expect(menu).toContain("[pathname]");
  });

  it("keeps the older unmounted menus in the tree", () => {
    // Preservation: frozen, not deleted.
    expect(read("src/components/shell/ProfileMenu.tsx")).toContain("export function ProfileMenu");
    expect(read("src/shell/OrbMenu.tsx")).toContain("export function OrbMenu");
  });
});
