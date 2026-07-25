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
  | "social"
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
  { id: "feed", label: "Home", to: "/", icon: AudioLines, end: true },
  { id: "connect", label: "Network", to: "/connect", icon: Users },
  { id: "collabs", label: "Studio", to: "/projects", icon: FolderGit2 },
  { id: "social", label: "Social", to: "/social", icon: Users },
  { id: "live", label: "Live", to: "/live", icon: Radio },
  { id: "messages", label: "Messages", to: "/messages", icon: MessageSquare, badgeUnread: false },
  { id: "profile", label: "You", to: "/profile", icon: Users },
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

/** Default hubs — Orb is fixed center and never part of pin state. */
export const DEFAULT_PINS: TaskbarPinsState = {
  left: ["feed", "connect", "collabs"],
  right: ["social", "messages", "profile"],
};

const KEY = "vybz.taskbarPins";
/** Left of Orb — denser creative hubs. */
export const MAX_LEFT = 6;
/** Right of Orb — utilities; a single pin expands to fill the side. */
export const MAX_RIGHT = 6;
/** @deprecated use MAX_LEFT / MAX_RIGHT */
export const MAX_SIDE = MAX_LEFT;

const listeners = new Set<() => void>();

let cached: TaskbarPinsState = {
  left: [...DEFAULT_PINS.left],
  right: [...DEFAULT_PINS.right],
};
let cachedRaw: string | null = null;
let cacheReady = false;

function samePins(a: TaskbarPinsState, b: TaskbarPinsState): boolean {
  return (
    a.left.length === b.left.length &&
    a.right.length === b.right.length &&
    a.left.every((id, i) => id === b.left[i]) &&
    a.right.every((id, i) => id === b.right[i])
  );
}

function maxFor(side: PinSide): number {
  return side === "left" ? MAX_LEFT : MAX_RIGHT;
}

function cleanSide(arr: unknown, fallback: PinId[], max: number): PinId[] {
  if (!Array.isArray(arr)) return [...fallback];
  const ids = arr.filter((id): id is PinId => typeof id === "string" && id in PIN_BY_ID);
  return [...new Set(ids)].slice(0, max);
}

function normalize(raw: unknown): TaskbarPinsState {
  if (!raw || typeof raw !== "object") {
    return { left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
  }
  const o = raw as { left?: unknown; right?: unknown };
  let left = cleanSide(o.left, DEFAULT_PINS.left, MAX_LEFT);
  let right = cleanSide(o.right, DEFAULT_PINS.right, MAX_RIGHT);
  // A pin can only live on one side
  const rightSet = new Set(right);
  left = left.filter((id) => !rightSet.has(id));
  return { left, right };
}

function readPins(): TaskbarPinsState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cacheReady && raw === cachedRaw) return cached;
  const next = raw ? normalize(JSON.parse(raw)) : { left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
  cachedRaw = raw;
  cacheReady = true;
  if (!samePins(cached, next)) cached = next;
  return cached;
}

export function getTaskbarPins(): TaskbarPinsState {
  try {
    return readPins();
  } catch {
    if (!cacheReady) {
      cached = { left: [...DEFAULT_PINS.left], right: [...DEFAULT_PINS.right] };
      cachedRaw = null;
      cacheReady = true;
    }
    return cached;
  }
}

export function setTaskbarPins(next: TaskbarPinsState) {
  const state = normalize(next);
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    cached = state;
    cachedRaw = raw;
    cacheReady = true;
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
  if (pin.to === "/profile") return pathname.startsWith("/profile") || pathname.startsWith("/u/") || pathname.startsWith("/artist/");
  return pathname === pin.to || pathname.startsWith(`${pin.to}/`);
}

export function catalogForRole(opts: { isMod?: boolean; isAdmin?: boolean }): PinDef[] {
  return PIN_CATALOG.filter((p) => {
    if (p.staff === "admin") return !!opts.isAdmin;
    if (p.staff === "mod") return !!(opts.isMod || opts.isAdmin);
    return true;
  });
}

export type PinSide = "left" | "right";

export interface PinSlot {
  side: PinSide;
  index: number;
}

export function removePin(state: TaskbarPinsState, slot: PinSlot): TaskbarPinsState {
  const left = [...state.left];
  const right = [...state.right];
  const arr = slot.side === "left" ? left : right;
  if (slot.index < 0 || slot.index >= arr.length) return state;
  arr.splice(slot.index, 1);
  return { left, right };
}

/** Insert (or move) a pin into a side at index. Drops from the other side if needed. */
export function insertPin(state: TaskbarPinsState, id: PinId, to: PinSlot): TaskbarPinsState {
  if (!(id in PIN_BY_ID)) return state;
  let left = state.left.filter((x) => x !== id);
  let right = state.right.filter((x) => x !== id);
  const dst = to.side === "left" ? left : right;
  const max = maxFor(to.side);
  const insertAt = Math.max(0, Math.min(to.index, dst.length));
  if (dst.length >= max) {
    // Replace at nearest index when side is full
    const replaceAt = Math.min(insertAt, dst.length - 1);
    if (replaceAt < 0) return { left, right };
    dst[replaceAt] = id;
  } else {
    dst.splice(insertAt, 0, id);
  }
  return { left, right };
}

/**
 * Move a pin from one slot to another. If the target side is full and the source
 * is the other side, swap with the pin at the target index.
 */
export function reorderPin(
  state: TaskbarPinsState,
  from: PinSlot,
  to: PinSlot,
): TaskbarPinsState {
  const left = [...state.left];
  const right = [...state.right];
  const src = from.side === "left" ? left : right;
  const dst = to.side === "left" ? left : right;
  const maxDst = maxFor(to.side);

  if (from.index < 0 || from.index >= src.length) return state;
  if (to.index < 0) return state;

  if (from.side === to.side) {
    if (to.index >= src.length) return state;
    const [id] = src.splice(from.index, 1);
    const insertAt = Math.min(to.index, src.length);
    src.splice(insertAt, 0, id);
    return { left, right };
  }

  const [id] = src.splice(from.index, 1);
  if (dst.length >= maxDst) {
    const targetIdx = Math.min(to.index, dst.length - 1);
    if (targetIdx < 0) {
      src.splice(from.index, 0, id);
      return state;
    }
    const [swapped] = dst.splice(targetIdx, 1, id);
    src.splice(Math.min(from.index, src.length), 0, swapped);
  } else {
    const insertAt = Math.min(to.index, dst.length);
    dst.splice(insertAt, 0, id);
  }
  return { left, right };
}
