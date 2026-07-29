/** Pure helpers for window prefs restore — unit-tested without Tauri. */

export type WindowPrefs = {
  width: number;
  height: number;
  x?: number | null;
  y?: number | null;
  theme: string;
};

export const DEFAULT_WINDOW_PREFS: WindowPrefs = {
  width: 1440,
  height: 900,
  x: null,
  y: null,
  theme: "dark",
};

export function normalizeWindowPrefs(raw: Partial<WindowPrefs> | null | undefined): WindowPrefs {
  const width = clamp(Number(raw?.width ?? DEFAULT_WINDOW_PREFS.width), 640, 7680);
  const height = clamp(Number(raw?.height ?? DEFAULT_WINDOW_PREFS.height), 480, 4320);
  const theme = typeof raw?.theme === "string" && raw.theme ? raw.theme : "dark";
  return {
    width,
    height,
    x: raw?.x == null ? null : Number(raw.x),
    y: raw?.y == null ? null : Number(raw.y),
    theme,
  };
}

export function prefsEqual(a: WindowPrefs, b: WindowPrefs): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    (a.x ?? null) === (b.x ?? null) &&
    (a.y ?? null) === (b.y ?? null) &&
    a.theme === b.theme
  );
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
