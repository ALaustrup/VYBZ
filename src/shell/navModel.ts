import {
  Activity,
  BookOpen,
  Library,
  Radio,
  ShieldCheck,
  User,
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
 * Default chrome is Me, Library, Live, and Network (PRODUCT.md v9 Phase 1).
 * Workspace lives at `/workspace` and is archived from nav, not deleted.
 * Living Mix, Rooms, Make pack, Sales, and Packages stay in the tree and
 * resolve by URL — they are listed in ARCHIVED_NAV_PATHS, not deleted.
 *
 * Only destinations that render a working surface may appear.
 */
export function navGroups(): NavGroup[] {
  return [
    {
      id: "work",
      label: "Work",
      items: [
        {
          path: "/library",
          label: "Library",
          hint: "Your works",
          icon: Library,
          productId: "home",
        },
      ],
    },
    {
      id: "network",
      label: "Network",
      items: [
        {
          path: "/feed",
          label: "Network",
          hint: "Creators and new work",
          icon: Activity,
          productId: "home",
        },
        {
          path: "/live",
          label: "Live",
          hint: "Who is creating right now",
          icon: Radio,
          productId: "home",
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
      path: "/connect",
      label: "People",
      hint: "Find creators",
      icon: Users,
      productId: "home",
    },
    {
      path: "/profile/edit",
      label: "Edit profile",
      hint: "Name, avatar, links",
      icon: UserCog,
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
