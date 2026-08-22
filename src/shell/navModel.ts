import {
  ShieldCheck,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { SuiteProductId } from "@/design/tokens";

/** Which live counter, if any, badges this destination. */
export type NavBadge = "messages" | "notifications";

export type NavItem = {
  path: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  productId: SuiteProductId;
  badge?: NavBadge;
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Default chrome is quiet (PRODUCT.md v9 Phase 2): VYBZ · Search · + · Chat ·
 * Alerts · Me. Kingdoms (Library, Network, Live, Workspace) stay in the tree
 * and resolve by URL — they are listed in ARCHIVED_NAV_PATHS, not deleted.
 *
 * The left rail is unmounted. HOME_ITEM still names Me so tests and the
 * command palette know where home is.
 */
export function navGroups(): NavGroup[] {
  return [];
}

/**
 * Destinations that used to live in the app-bar avatar dropdown. That dropdown was a
 * second navigation menu duplicating the rail, so it is gone and its unique entries live
 * here instead.
 */
export function accountItems(role: string, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [];
  const mod = isAdmin || role === "admin" || role === "moderator";
  if (mod) {
    items.push({
      path: "/mod",
      label: "Moderate",
      hint: "Report queue",
      icon: ShieldCheck,
      productId: "home",
    });
  }
  if (isAdmin || role === "admin") {
    items.push({
      path: "/admin",
      label: "Admin",
      hint: "Admin",
      icon: Wrench,
      productId: "home",
    });
  }
  return items;
}

export const HOME_ITEM: NavItem = {
  path: "/",
  label: "Me",
  hint: "Your VYBZ",
  icon: User,
  productId: "artist",
};

export function navItems(): NavItem[] {
  return [HOME_ITEM, ...navGroups().flatMap((g) => g.items)];
}

/** Paths archived from nav but still linkable by URL (freeze-not-delete). */
export const ARCHIVED_NAV_PATHS = [
  "/workspace",
  "/library",
  "/feed",
  "/live",
  "/connect",
  "/codex",
  "/studio",
  "/market",
  "/store",
  "/discover",
  "/messages",
  "/notifications",
  "/library/mix",
  "/rooms",
  "/make",
  "/make/dashboard",
] as const;
