import {
  BookOpen,
  Disc,
  Library,
  Package,
  Radio,
  ShieldCheck,
  UserCog,
  Users,
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
 * The rail is the live-mix platform menu (PRODUCT.md v3).
 *
 * Default experience leads with live mix streaming, active rooms, and studio tools.
 * Other surfaces stay reachable by URL and are listed in ARCHIVED_NAV_PATHS.
 *
 * Only destinations that render a working surface may appear.
 */
export function navGroups(): NavGroup[] {
  return [
    {
      id: "live",
      label: "Live",
      items: [
        {
          path: "/library/mix",
          label: "Living Mix",
          hint: "Mix engine",
          icon: Disc,
          productId: "home",
        },
        {
          path: "/rooms",
          label: "Rooms",
          hint: "Collab sessions",
          icon: Users,
          productId: "home",
        },
      ],
    },
    {
      id: "studio",
      label: "Studio",
      items: [
        {
          path: "/library",
          label: "Library",
          hint: "Your files",
          icon: Library,
          productId: "home",
        },
        {
          path: "/make",
          label: "Make pack",
          hint: "Sample pack builder",
          icon: Package,
          productId: "market",
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
  path: "/live",
  label: "Live Mix",
  hint: "Live mix streaming",
  icon: Radio,
  productId: "home",
};

export function navItems(): NavItem[] {
  return [HOME_ITEM, ...navGroups().flatMap((g) => g.items)];
}

/** Paths archived from nav but still linkable by URL (freeze-not-delete). */
export const ARCHIVED_NAV_PATHS = [
  "/studio",
  "/market",
  "/store",
  "/feed",
  "/discover",
  "/messages",
  "/notifications",
  "/",
] as const;
