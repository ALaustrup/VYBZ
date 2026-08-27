import {
  Home,
  Library,
  MessageSquare,
  Radio,
  ShieldCheck,
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

/** Primary rail destinations — every item must resolve to a working route. */
const PRIMARY_NAV: NavItem[] = [
  {
    path: "/messages",
    label: "Messages",
    hint: "Inbox",
    icon: MessageSquare,
    productId: "home",
    badge: "messages",
  },
  {
    path: "/live",
    label: "Live",
    hint: "Who is live",
    icon: Radio,
    productId: "live",
  },
  {
    path: "/library",
    label: "Library",
    hint: "Your works",
    icon: Library,
    productId: "artist",
  },
];

/**
 * Desktop PrimaryRail and the mobile drawer share this model.
 * Explore and Settings are omitted until they ship real surfaces (Phase 2+).
 */
export function navGroups(): NavGroup[] {
  return [{ id: "navigate", label: "Navigate", items: PRIMARY_NAV }];
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
  label: "Home",
  hint: "People & live",
  icon: Home,
  productId: "home",
};

/** Owner Stage File — same object as public `/u/:id`, owner perspective. */
export function ownerProfilePath(userId: string | null | undefined): string {
  return userId ? `/u/${userId}` : "/";
}

export function navItems(): NavItem[] {
  return [HOME_ITEM, ...navGroups().flatMap((g) => g.items)];
}

/** Paths archived from nav but still linkable by URL (freeze-not-delete). */
export const ARCHIVED_NAV_PATHS = [
  "/workspace",
  "/feed",
  "/connect",
  "/codex",
  "/studio",
  "/market",
  "/store",
  "/discover",
  "/notifications",
  "/library/mix",
  "/rooms",
  "/make",
  "/make/dashboard",
] as const;
