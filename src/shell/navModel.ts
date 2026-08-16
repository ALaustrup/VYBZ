import {
  BookOpen,
  Library,
  Package,
  Radio,
  ShieldCheck,
  UserCog,
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
 * The rail is the pack-suite menu.
 *
 * Default experience is the staged pack pipeline (PRODUCT.md v2). Social
 * surfaces stay reachable by URL and are listed in ARCHIVED_NAV_PATHS.
 *
 * Only destinations that render a working surface may appear.
 */
export function navGroups(): NavGroup[] {
  return [
    {
      id: "pack",
      label: "Pack",
      items: [
        {
          path: "/library",
          label: "Library",
          hint: "Your files",
          icon: Library,
          productId: "home",
        },
        {
          path: "/make/dashboard",
          label: "Sales",
          hint: "What sold",
          icon: Radio,
          productId: "market",
        },
      ],
    },
  ];
}

/**
 * Destinations that used to live in the app-bar avatar dropdown. That dropdown was a
 * second navigation menu duplicating the rail, so it is gone and its unique entries live
 * here instead.
 */
export function accountItems(role: string, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    {
      path: "/profile/edit",
      label: "Edit profile",
      hint: "Name, avatar, links",
      icon: UserCog,
      productId: "home",
    },
    {
      path: "/store",
      label: "Packages",
      hint: "Buy V¢",
      icon: Package,
      productId: "home",
    },
    { path: "/codex", label: "Codex", hint: "Docs and legal", icon: BookOpen, productId: "home" },
  ];
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
  path: "/make",
  label: "Make pack",
  hint: "Upload to sale",
  icon: Package,
  productId: "market",
};

export function navItems(): NavItem[] {
  return [HOME_ITEM, ...navGroups().flatMap((g) => g.items)];
}

/** Paths archived from nav but still linkable by URL (freeze-not-delete). */
export const ARCHIVED_NAV_PATHS = [
  "/studio",
  "/live",
  "/market",
  "/store",
  "/feed",
  "/discover",
  "/rooms",
  "/messages",
  "/notifications",
  "/",
] as const;
