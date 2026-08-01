import {
  BookOpen,
  Compass,
  CreditCard,
  Gauge,
  Home,
  Library,
  ListChecks,
  MessageSquare,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  UserCog,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { FLAGS } from "@/lib/flags";
import type { SuiteProductId } from "@/design/tokens";

export type NavItem = {
  path: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  productId: SuiteProductId;
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Only destinations that render a working surface.
 *
 * `suiteNavRoutes()` advertised fourteen entries, eight of which rendered
 * `SuitePlaceholderPage` — Credits, MasterReady, CoverLab, Sentinel, Relay, Wallet,
 * Settings, and Market when the storefront flag is off. Meanwhile the Credits, Master and
 * Distribution surfaces that do work are per-release and had no entry at all. Advertising
 * products that do not exist is the façade this model removes; a destination earns a place
 * here by being reachable and functional, not by being planned.
 */
export function navGroups(): NavGroup[] {
  const groups: NavGroup[] = [
    {
      id: "create",
      label: "Create",
      items: [
        {
          path: "/releases",
          label: "Releases",
          hint: "Scan a master for release readiness",
          icon: ListChecks,
          productId: "prepare",
        },
        {
          path: "/studio",
          label: "Studio",
          hint: "Projects and version history",
          icon: Waves,
          productId: "studio",
        },
      ],
    },
    {
      id: "listen",
      label: "Listen",
      items: [
        {
          path: "/discover",
          label: "Discover",
          hint: "New work from other creators",
          icon: Compass,
          productId: "home",
        },
        {
          path: "/live",
          label: "Live",
          hint: "Sessions happening now",
          icon: Radio,
          productId: "live",
        },
        {
          path: "/library",
          label: "Library",
          hint: "Everything you saved or bought",
          icon: Library,
          productId: "home",
        },
      ],
    },
    {
      id: "account",
      label: "Account",
      items: [
        {
          path: "/messages",
          label: "Messages",
          hint: "Direct conversations",
          icon: MessageSquare,
          productId: "home",
        },
        {
          path: "/settings/credits",
          label: "AI minutes",
          hint: "Prepaid processing balance",
          icon: CreditCard,
          productId: "home",
        },
        {
          path: "/settings/costs",
          label: "Usage",
          hint: "What your account has spent",
          icon: Gauge,
          productId: "home",
        },
      ],
    },
  ];

  if (FLAGS.storefront) {
    groups[1]!.items.splice(2, 0, {
      path: "/market",
      label: "Market",
      hint: "Sample packs and downloads",
      icon: Store,
      productId: "market",
    });
  }

  return groups;
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
    { path: "/store", label: "Flair", hint: "Cosmetics", icon: Sparkles, productId: "home" },
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
  hint: "Your hub",
  icon: Home,
  productId: "home",
};

export function navItems(): NavItem[] {
  return [HOME_ITEM, ...navGroups().flatMap((g) => g.items)];
}
