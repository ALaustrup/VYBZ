/** Persisted VDock audio-reactive visualizer mode. */

export const VDOCK_VIZ_MODES = ["bars", "mirror", "wave", "pulse"] as const;
export type VdockVizMode = (typeof VDOCK_VIZ_MODES)[number];

const KEY = "vybz.vdock.vizMode";

const LABELS: Record<VdockVizMode, string> = {
  bars: "Bars",
  mirror: "Mirror",
  wave: "Wave",
  pulse: "Pulse",
};

let mode: VdockVizMode = readStored();
const listeners = new Set<() => void>();

function readStored(): VdockVizMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (VDOCK_VIZ_MODES as readonly string[]).includes(v)) return v as VdockVizMode;
  } catch {
    /* ignore */
  }
  return "bars";
}

export function getVdockVizMode(): VdockVizMode {
  return mode;
}

export function vdockVizLabel(m: VdockVizMode): string {
  return LABELS[m];
}

export function setVdockVizMode(next: VdockVizMode) {
  if (mode === next) return;
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function cycleVdockVizMode(): VdockVizMode {
  const i = VDOCK_VIZ_MODES.indexOf(mode);
  const next = VDOCK_VIZ_MODES[(i + 1) % VDOCK_VIZ_MODES.length]!;
  setVdockVizMode(next);
  return next;
}

export function subscribeVdockVizMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
