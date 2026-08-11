/**
 * V-Dock — unified bottom dock (pins + widgets). Orb is fixed and never a slot.
 * Migrates legacy `vybz.taskbarPins` → `vybz.vdockLayout`.
 *
 * Widgets are creatively unbounded: music-led defaults first, but VYBZ serves
 * all creators — new widgets may target any craft without being audio-gated.
 */

import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AudioLines,
  Bell,
  Clipboard,
  Disc3,
  Ear,
  Eye,
  FolderGit2,
  Gauge,
  Hash,
  Home,
  Images,
  KeyRound,
  Lightbulb,
  MessageSquare,
  Mic,
  Moon,
  Music2,
  Package,
  Radio,
  Scale,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Timer,
  Users,
  Volume2,
  Wallet,
  Watch,
  Wifi,
  Zap,
} from "lucide-react";

// ── Pins (nav) ───────────────────────────────────────────────────────────────

export type PinId =
  | "feed" | "drops" | "connect" | "collabs" | "social" | "live" | "messages" | "profile"
  | "activity" | "discover" | "opportunities" | "store" | "codex"
  | "rooms" | "library" | "mod" | "admin";

export interface PinDef {
  id: PinId;
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badgeUnread?: boolean;
  staff?: "mod" | "admin";
}

export const PIN_CATALOG: PinDef[] = [
  { id: "feed", label: "Home", to: "/", icon: Home, end: true },
  { id: "drops", label: "Listen", to: "/?tab=listen", icon: AudioLines },
  { id: "connect", label: "Collaborate", to: "/connect", icon: Users },
  { id: "collabs", label: "You", to: "/?tab=you", icon: FolderGit2 },
  { id: "social", label: "Live", to: "/?tab=live", icon: Users },
  { id: "live", label: "Live", to: "/?tab=live", icon: Radio },
  { id: "messages", label: "You", to: "/?tab=you", icon: MessageSquare },
  { id: "profile", label: "You", to: "/?tab=you", icon: Users },
  { id: "activity", label: "Live feed", to: "/?tab=live", icon: Bell, badgeUnread: true },
  { id: "discover", label: "Listen", to: "/?tab=listen", icon: Search },
  { id: "opportunities", label: "You", to: "/?tab=you", icon: FolderGit2 },
  { id: "store", label: "Packages", to: "/store", icon: Store },
  { id: "codex", label: "Codex", to: "/codex", icon: ScrollText },
  { id: "rooms", label: "You", to: "/?tab=you", icon: Hash },
  { id: "library", label: "You", to: "/?tab=you", icon: Images },
  { id: "mod", label: "Moderate", to: "/mod", icon: Shield, staff: "mod" },
  { id: "admin", label: "Admin", to: "/admin", icon: ShieldCheck, staff: "admin" },
];

export const PIN_BY_ID = Object.fromEntries(PIN_CATALOG.map((p) => [p.id, p])) as Record<PinId, PinDef>;

// ── Widgets (tools) ──────────────────────────────────────────────────────────

export type WidgetId =
  | "quickCapture" | "sessionTimer" | "clipboardStem" | "ideaScratch"
  | "metronome" | "keyScale" | "tuningFork" | "fxIntensity" | "monitorCue"
  | "openToWork" | "matchRadar" | "inviteQueue" | "roleBadge" | "nearbyScene"
  | "bridgeWatch" | "repoPulse" | "handoffReady" | "licenseStamp" | "watermarkTrust"
  | "goLiveArm" | "voiceSlots" | "topLivePeek" | "listenTogether"
  | "vcBalance" | "tipJar" | "listingHeat"
  | "unreadStack" | "dmQuickReply" | "studioPresence"
  | "earBreak" | "levelGuard" | "nightCraft";

export interface WidgetDef {
  id: WidgetId;
  label: string;
  blurb: string;
  icon: LucideIcon;
  /** Go / Studio emphasis for catalog grouping. */
  context: "go" | "studio" | "both";
}

export const WIDGET_CATALOG: WidgetDef[] = [
  { id: "quickCapture", label: "Capture", blurb: "Hum / voice memo → WIP", icon: Mic, context: "both" },
  { id: "sessionTimer", label: "Session", blurb: "Focus timer + save nudge", icon: Timer, context: "studio" },
  { id: "clipboardStem", label: "Stem clip", blurb: "Last stem meta re-share", icon: Clipboard, context: "studio" },
  { id: "ideaScratch", label: "Scratch", blurb: "One-line hook note", icon: Lightbulb, context: "both" },
  { id: "metronome", label: "Metronome", blurb: "Pulse + tap tempo", icon: Watch, context: "both" },
  { id: "keyScale", label: "Key", blurb: "Project key / mode", icon: KeyRound, context: "both" },
  { id: "tuningFork", label: "A440", blurb: "Reference tone", icon: Disc3, context: "both" },
  { id: "fxIntensity", label: "FX", blurb: "Off / Soft / VYBZ Max", icon: Sparkles, context: "both" },
  { id: "monitorCue", label: "Monitor", blurb: "Duck Orb while tracking", icon: Ear, context: "studio" },
  { id: "openToWork", label: "Open", blurb: "Seeking / offering pulse", icon: Zap, context: "both" },
  { id: "matchRadar", label: "Matches", blurb: "Fresh high-fit count", icon: Users, context: "go" },
  { id: "inviteQueue", label: "Invites", blurb: "Pending collab invites", icon: Bell, context: "both" },
  { id: "roleBadge", label: "Roles", blurb: "I am / I need", icon: Hash, context: "both" },
  { id: "nearbyScene", label: "Scene", blurb: "Soft city / scene tag", icon: Wifi, context: "go" },
  { id: "bridgeWatch", label: "Bridge", blurb: "Folder sync health", icon: FolderGit2, context: "studio" },
  { id: "repoPulse", label: "Repos", blurb: "Active repo activity", icon: FolderGit2, context: "both" },
  { id: "handoffReady", label: "Handoff", blurb: "Stems package ready", icon: Package, context: "studio" },
  { id: "licenseStamp", label: "License", blurb: "Default share license", icon: Scale, context: "both" },
  { id: "watermarkTrust", label: "Trust", blurb: "Last verified download", icon: ShieldCheck, context: "go" },
  { id: "goLiveArm", label: "Go live", blurb: "Arm broadcast", icon: Radio, context: "both" },
  { id: "voiceSlots", label: "Voice", blurb: "G/Y/P room slots", icon: Volume2, context: "both" },
  { id: "topLivePeek", label: "Top live", blurb: "Peek Top 3 live", icon: Eye, context: "go" },
  { id: "listenTogether", label: "Listen", blurb: "Room sync chip", icon: Music2, context: "both" },
  { id: "vcBalance", label: "V¢", blurb: "Balance + top-up", icon: Wallet, context: "both" },
  { id: "tipJar", label: "Tips", blurb: "Recent tip pulse", icon: Activity, context: "go" },
  { id: "listingHeat", label: "Listing", blurb: "Repo listing interest", icon: Gauge, context: "studio" },
  { id: "unreadStack", label: "Inbox", blurb: "DMs + live feed", icon: Bell, context: "both" },
  { id: "dmQuickReply", label: "Reply", blurb: "Latest DM quick send", icon: MessageSquare, context: "go" },
  { id: "studioPresence", label: "Room", blurb: "Who's in project", icon: Users, context: "studio" },
  { id: "earBreak", label: "Ears", blurb: "Hearing break timer", icon: Ear, context: "studio" },
  { id: "levelGuard", label: "Levels", blurb: "Hot output caution", icon: Gauge, context: "studio" },
  { id: "nightCraft", label: "Night", blurb: "Soft FX late mode", icon: Moon, context: "both" },
];

export const WIDGET_BY_ID = Object.fromEntries(WIDGET_CATALOG.map((w) => [w.id, w])) as Record<WidgetId, WidgetDef>;

// ── Layout ───────────────────────────────────────────────────────────────────

export type DockSide = "left" | "right";

export type DockItem =
  | { kind: "pin"; id: PinId }
  | { kind: "widget"; id: WidgetId };

export interface VDockLayout {
  left: DockItem[];
  right: DockItem[];
}

export const MAX_LEFT = 8;
export const MAX_RIGHT = 8;
/** @deprecated */
export const MAX_SIDE = MAX_LEFT;

export const DEFAULT_LAYOUT: VDockLayout = {
  left: [
    { kind: "pin", id: "feed" },
    { kind: "pin", id: "drops" },
  ],
  right: [
    { kind: "pin", id: "messages" },
    { kind: "pin", id: "profile" },
  ],
};

const KEY = "vybz.vdockLayout";
const LEGACY_KEY = "vybz.taskbarPins";
const listeners = new Set<() => void>();

let cached: VDockLayout = structuredClone(DEFAULT_LAYOUT);
let cachedRaw: string | null = null;
let cacheReady = false;

function maxFor(side: DockSide): number {
  return side === "left" ? MAX_LEFT : MAX_RIGHT;
}

function itemKey(it: DockItem): string {
  return `${it.kind}:${it.id}`;
}

function isPinId(id: string): id is PinId {
  return id in PIN_BY_ID;
}
function isWidgetId(id: string): id is WidgetId {
  return id in WIDGET_BY_ID;
}

function cleanItems(arr: unknown, max: number): DockItem[] {
  if (!Array.isArray(arr)) return [];
  const out: DockItem[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as { kind?: string; id?: string };
    let item: DockItem | null = null;
    if (o.kind === "pin" && typeof o.id === "string" && isPinId(o.id)) {
      item = { kind: "pin", id: o.id };
    } else if (o.kind === "widget" && typeof o.id === "string" && isWidgetId(o.id)) {
      item = { kind: "widget", id: o.id };
    } else if (typeof o.id === "string" && isPinId(o.id) && !o.kind) {
      // tolerate bare pin ids
      item = { kind: "pin", id: o.id };
    }
    if (!item) continue;
    const k = itemKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function migrateLegacy(raw: string): VDockLayout | null {
  try {
    const o = JSON.parse(raw) as { left?: string[]; right?: string[] };
    const toPins = (ids: unknown, max: number): DockItem[] => {
      if (!Array.isArray(ids)) return [];
      const out: DockItem[] = [];
      for (const id of ids) {
        if (typeof id === "string" && isPinId(id)) out.push({ kind: "pin", id });
        if (out.length >= max) break;
      }
      return out;
    };
    return {
      left: toPins(o.left, MAX_LEFT),
      right: toPins(o.right, MAX_RIGHT),
    };
  } catch {
    return null;
  }
}

function normalize(raw: unknown): VDockLayout {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_LAYOUT);
  const o = raw as { left?: unknown; right?: unknown };
  let left = cleanItems(o.left, MAX_LEFT);
  let right = cleanItems(o.right, MAX_RIGHT);
  const rightKeys = new Set(right.map(itemKey));
  left = left.filter((it) => !rightKeys.has(itemKey(it)));
  if (!left.length && !right.length) return structuredClone(DEFAULT_LAYOUT);
  return { left, right };
}

function readLayout(): VDockLayout {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const migrated = migrateLegacy(legacy);
        if (migrated) {
          const norm = normalize(migrated);
          localStorage.setItem(KEY, JSON.stringify(norm));
          raw = JSON.stringify(norm);
        }
      }
    }
  } catch {
    raw = null;
  }
  if (cacheReady && raw === cachedRaw) return cached;
  const next = raw ? normalize(JSON.parse(raw)) : structuredClone(DEFAULT_LAYOUT);
  cachedRaw = raw;
  cacheReady = true;
  cached = next;
  return cached;
}

export function getVDockLayout(): VDockLayout {
  try {
    return readLayout();
  } catch {
    return structuredClone(DEFAULT_LAYOUT);
  }
}

export function setVDockLayout(next: VDockLayout) {
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

export function useVDockLayout(): VDockLayout {
  return useSyncExternalStore(subscribe, getVDockLayout, getVDockLayout);
}

export function pinIsActive(pin: PinDef, pathname: string, search = ""): boolean {
  const pathOnly = pin.to.split("?")[0] || pin.to;
  if (pin.end) return pathname === pathOnly;
  if (pin.id === "activity") {
    const tab = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("tab");
    return pathname.startsWith("/profile") && (tab === "live" || tab == null || tab === "");
  }
  if (pathOnly === "/profile") {
    return pathname.startsWith("/profile") || pathname.startsWith("/u/") || pathname.startsWith("/artist/");
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function catalogPinsForRole(opts: { isMod?: boolean; isAdmin?: boolean }): PinDef[] {
  return PIN_CATALOG.filter((p) => {
    if (p.staff === "admin") return !!opts.isAdmin;
    if (p.staff === "mod") return !!(opts.isMod || opts.isAdmin);
    return true;
  });
}

export type DockSlot = { side: DockSide; index: number };

export function removeDockItem(state: VDockLayout, slot: DockSlot): VDockLayout {
  const left = [...state.left];
  const right = [...state.right];
  const arr = slot.side === "left" ? left : right;
  if (slot.index < 0 || slot.index >= arr.length) return state;
  arr.splice(slot.index, 1);
  return { left, right };
}

export function insertDockItem(state: VDockLayout, item: DockItem, to: DockSlot): VDockLayout {
  const k = itemKey(item);
  let left = state.left.filter((x) => itemKey(x) !== k);
  let right = state.right.filter((x) => itemKey(x) !== k);
  const dst = to.side === "left" ? left : right;
  const max = maxFor(to.side);
  const insertAt = Math.max(0, Math.min(to.index, dst.length));
  if (dst.length >= max) {
    const replaceAt = Math.min(insertAt, dst.length - 1);
    if (replaceAt < 0) return { left, right };
    dst[replaceAt] = item;
  } else {
    dst.splice(insertAt, 0, item);
  }
  return { left, right };
}

export function reorderDockItem(state: VDockLayout, from: DockSlot, to: DockSlot): VDockLayout {
  const left = [...state.left];
  const right = [...state.right];
  const src = from.side === "left" ? left : right;
  const dst = to.side === "left" ? left : right;
  const maxDst = maxFor(to.side);
  if (from.index < 0 || from.index >= src.length) return state;

  if (from.side === to.side) {
    if (to.index >= src.length) return state;
    const [it] = src.splice(from.index, 1);
    src.splice(Math.min(to.index, src.length), 0, it);
    return { left, right };
  }

  const [it] = src.splice(from.index, 1);
  if (dst.length >= maxDst) {
    const targetIdx = Math.min(to.index, dst.length - 1);
    if (targetIdx < 0) {
      src.splice(from.index, 0, it);
      return state;
    }
    const [swapped] = dst.splice(targetIdx, 1, it);
    src.splice(Math.min(from.index, src.length), 0, swapped);
  } else {
    dst.splice(Math.min(to.index, dst.length), 0, it);
  }
  return { left, right };
}

// Legacy aliases used during migration of call sites
export type PinSide = DockSide;
export type PinSlot = DockSlot;
export type TaskbarPinsState = { left: PinId[]; right: PinId[] };

export function getTaskbarPins(): TaskbarPinsState {
  const L = getVDockLayout();
  return {
    left: L.left.filter((x): x is { kind: "pin"; id: PinId } => x.kind === "pin").map((x) => x.id),
    right: L.right.filter((x): x is { kind: "pin"; id: PinId } => x.kind === "pin").map((x) => x.id),
  };
}

export function setTaskbarPins(next: TaskbarPinsState) {
  setVDockLayout({
    left: next.left.map((id) => ({ kind: "pin" as const, id })),
    right: next.right.map((id) => ({ kind: "pin" as const, id })),
  });
}

export function useTaskbarPins(): TaskbarPinsState {
  const L = useVDockLayout();
  return {
    left: L.left.filter((x): x is { kind: "pin"; id: PinId } => x.kind === "pin").map((x) => x.id),
    right: L.right.filter((x): x is { kind: "pin"; id: PinId } => x.kind === "pin").map((x) => x.id),
  };
}

export const catalogForRole = catalogPinsForRole;
