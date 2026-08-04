/** @deprecated Pulse module order for orphaned Living Home — not used by Music Hub. */

export type PulseId = "spark" | "messages" | "network" | "drops" | "live";

const KEY = "vybz.livingPulseLayout";

export const PULSE_CATALOG: { id: PulseId; title: string; defaultBody: string; to: string }[] = [
  { id: "messages", title: "Inbox", defaultBody: "", to: "/messages" },
  { id: "network", title: "Network", defaultBody: "", to: "/connect" },
  { id: "drops", title: "Drops", defaultBody: "", to: "/feed" },
  { id: "live", title: "Live", defaultBody: "", to: "/social" },
];

export function defaultPulseOrder(opts: {
  loveOn: boolean;
  meetupOn: boolean;
  createOn: boolean;
}): PulseId[] {
  void opts.loveOn;
  void opts.meetupOn;
  const out: PulseId[] = ["messages"];
  if (opts.createOn) out.push("network", "drops");
  out.push("live");
  for (const p of PULSE_CATALOG) {
    if (!out.includes(p.id)) out.push(p.id);
  }
  return out;
}

function remapPulseId(id: string): PulseId | null {
  if (id === "spark") return "network";
  return PULSE_CATALOG.some((p) => p.id === id) ? (id as PulseId) : null;
}

export function loadPulseOrder(fallback: PulseId[]): PulseId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return fallback;
    const valid: PulseId[] = [];
    for (const rawId of arr) {
      if (typeof rawId !== "string") continue;
      const id = remapPulseId(rawId);
      if (id && !valid.includes(id)) valid.push(id);
    }
    for (const p of PULSE_CATALOG) {
      if (!valid.includes(p.id)) valid.push(p.id);
    }
    return valid.length ? valid : fallback;
  } catch {
    return fallback;
  }
}

export function savePulseOrder(order: PulseId[]) {
  try { localStorage.setItem(KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

export function reorderPulse(order: PulseId[], fromId: PulseId, toId: PulseId): PulseId[] {
  if (fromId === toId) return order;
  const next = order.filter((id) => id !== fromId);
  const at = next.indexOf(toId);
  if (at < 0) return order;
  next.splice(at, 0, fromId);
  return next;
}
