import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Bell,
  FolderGit2,
  MessageSquare,
  Radio,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

export type PinId =
  | "feed"
  | "connect"
  | "collabs"
  | "live"
  | "messages"
  | "profile"
  | "activity"
  | "discover"
  | "spark"
  | "opportunities"
  | "store"
  | "codex"
  | "rooms"
  | "mod"
  | "admin";

export interface PinDef {
  id: PinId;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Exact path match (Feed `/`). */
  end?: boolean;
  /** Show unread badge when session unread > 0. */
  badgeUnread?: boolean;
  /** Only list for staff. */
  staff?: "mod" | "admin";
}

export const PIN_CATALOG: PinDef[] = [
  { id: "feed", label: "Feed", to: "/", icon: AudioLines, end: true },
  { id: "connect", label: "Connect", to: "/connect", icon: Users },
  { id: "collabs", label: "Collabs", to: "/projects", icon: FolderGit2 },
  { id: "live", label: "Live", to: "/live", icon: Radio },
  { id: "messages", label: "Messages", to: "/messages", icon: MessageSquare, badgeUnread: false },
  { id: "profile", label: "Profile", to: "/profile", icon: Users },
  { id: "activity", label: "Activity", to: "/activity", icon: Bell, badgeUnread: true },
  { id: "discover", label: "Discover", to: "/discover", icon: Search },
  { id: "spark", label: "Spark", to: "/spark", icon: Sparkles },
  { id: "opportunities", label: "Opportunities", to: "/opportunities", icon: FolderGit2 },
  { id: "store", label: "Store", to: "/store", icon: Store },
  { id: "codex", label: "Codex", to: "/codex", icon: ScrollText },
  { id: "rooms", label: "Rooms", to: "/rooms", icon: MessageSquare },
  { id: "mod", label: "Moderate", to: "/mod", icon: Shield, staff: "mod" },
  { id: "admin", label: "Admin", to: "/admin", icon: ShieldCheck, staff: "admin" },
];

export const PIN_BY_ID = Object.fromEntries(PIN_CATALOG.map((p) => [p.id, p])) as Record<PinId, PinDef>;

export interface TaskbarPinsState {
  left: PinId[];
  right: PinId[];
}

export const DEFAULT_PINS: TaskbarPinsState = {
  left: ["feed", "connect", "collabs"],
  right: ["live", "messages", "profile"],
};

const KEY = "vybz.taskbarPins";
const MAX_SIDE = 4;
const listeners = new Set<() => void>();

function normalize(raw: unknown): TaskbarPinsState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PINS, left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
  const o = raw as { left?: unknown; right?: unknown };
  const clean = (arr: unknown, fallback: PinId[]) => {
    if (!Array.isArray(arr)) return [...fallback];
    const ids = arr.filter((id): id is PinId => typeof id === "string" && id in PIN_BY_ID);
    const uniq = [...new Set(ids)];
    return uniq.slice(0, MAX_SIDE);
  };
  return { left: clean(o.left, DEFAULT_PINS.left), right: clean(o.right, DEFAULT_PINS.right) };
}

export function getTaskbarPins(): TaskbarPinsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
    return normalize(JSON.parse(raw));
  } catch {
    return { left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
  }
}

export function setTaskbarPins(next: TaskbarPinsState) {
  const state = normalize(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useTaskbarPins(): TaskbarPinsState {
  return useSyncExternalStore(subscribe, getTaskbarPins, getTaskbarPins);
}

export function pinIsActive(pin: PinDef, pathname: string): boolean {
  if (pin.end) return pathname === pin.to;
  if (pin.to === "/profile") return pathname.startsWith("/profile") || pathname.startsWith("/u/");
  return pathname === pin.to || pathname.startsWith(`${pin.to}/`);
}

export function catalogForRole(opts: { isMod?: boolean; isAdmin?: boolean }): PinDef[] {
  return PIN_CATALOG.filter((p) => {
    if (p.staff === "admin") return !!opts.isAdmin;
    if (p.staff === "mod") return !!(opts.isMod || opts.isAdmin);
    return true;
  });
}

export { MAX_SIDE };
