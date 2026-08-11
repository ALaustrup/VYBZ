import {
  Bell,
  BookOpen,
  Compass,
  Hash,
  Home,
  Library,
  MessageSquare,
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
 * The rail is the platform's single menu.
 *
 * VYBZ is a social network for music, sound and audio creators, so the rail carries
 * the social surfaces — feed, discovery, rooms, messages, notifications — and the
 * creator's own library. Production tools are not here: they live behind the Tools
 * launcher in the app bar so they stay optional.
 *
 * Only destinations that render a working surface may appear.
 */
export function navGroups(): NavGroup[] {
  return [
    {
      id: "social",
      label: "Social",
      items: [
        {
          path: "/feed",
          label: "Feed",
          hint: "What the people you follow are sharing",
          icon: Radio,
          productId: "home",
        },
        {
          path: "/discover",
          label: "Discover",
          hint: "Public feed of songs and samples",
          icon: Compass,
          productId: "home",
        },
        {
          path: "/rooms",
          label: "Rooms",
          hint: "Global and member-made chat rooms",
          icon: Hash,
          productId: "home",
        },
        {
          path: "/messages",
          label: "Messages",
          hint: "Direct conversations",
          icon: MessageSquare,
          productId: "home",
          badge: "messages",
        },
        {
          path: "/notifications",
          label: "Notifications",
          hint: "Requests, replies and activity",
          icon: Bell,
          productId: "home",
          badge: "notifications",
        },
      ],
    },
    {
      id: "music",
      label: "Music",
      items: [
        {
          path: "/library",
          label: "Library",
          hint: "Organize tracks, projects, and stages",
          icon: Library,
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
      path: "/profile/edit",
      label: "Edit profile",
      hint: "Name, avatar, links",
      icon: UserCog,
      productId: "home",
    },
    {
      path: "/store",
      label: "Packages",
      hint: "Buy V¢ for tips and support",
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
      hint: "Platform console",
      icon: Wrench,
      productId: "home",
    });
  }
  return items;
}

export const HOME_ITEM: NavItem = {
  path: "/",
  label: "Home",
  hint: "Your catalog and artist profile",
  icon: Home,
  productId: "home",
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
] as const;
