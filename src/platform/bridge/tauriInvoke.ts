import type { ExportedFile, SelectedFile } from "@/contracts";
import type { PortableAudioAnalysis } from "@vybz/processing/waveform";

export type WindowPrefs = {
  width: number;
  height: number;
  x?: number | null;
  y?: number | null;
  theme: "dark" | "light" | "system" | string;
};

/**
 * Optional Tauri invoke shim. Safe to import when Tauri is absent —
 * all functions return null/false so the desktop bridge can fall back to web APIs.
 */
export async function invokePickFiles(_kind: "audio" | "artwork"): Promise<SelectedFile[] | null> {
  if (!isTauriRuntime()) return null;
  return null;
}

export async function invokeSaveExport(_file: ExportedFile): Promise<boolean> {
  return false;
}

export async function invokeReveal(_path: string): Promise<boolean> {
  return false;
}

export async function invokeOpenUrl(_url: string): Promise<boolean> {
  return false;
}

export async function invokePing(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const invoke = getInvoke();
    if (!invoke) return null;
    const result = await invoke("vybz_ping");
    return typeof result === "string" ? result : String(result);
  } catch {
    return null;
  }
}

/** Native high-res waveform + loudness when `localPath` is available in Tauri. */
export async function invokeAnalyzeAudio(
  path: string,
  peakBuckets = 2048
): Promise<PortableAudioAnalysis | null> {
  if (!isTauriRuntime()) return null;
  try {
    const invoke = getInvoke();
    if (!invoke) return null;
    const raw = (await invoke("vybz_analyze_audio", { path, peakBuckets })) as Record<string, unknown>;
    return {
      peaks: (raw.peaks as number[]) ?? [],
      bucketCount: Number(raw.bucketCount ?? peakBuckets),
      sampleRate: Number(raw.sampleRate ?? 0),
      channels: Number(raw.channels ?? 0),
      durationSeconds: Number(raw.durationSeconds ?? 0),
      peakDbfs: Number(raw.peakDbfs ?? -120),
      rmsDbfs: Number(raw.rmsDbfs ?? -120),
      integratedLufsApprox: Number(raw.integratedLufsApprox ?? -70),
      // Native Rust path has not yet shipped BS.1770 / true peak (M4 disclosure).
      // Web/portable meters remain authoritative until native catches up.
      engine: "native",
      processingVersion: String(raw.processingVersion ?? "native.approx.1"),
    };
  } catch {
    return null;
  }
}

export async function invokeWindowPrefsGet(): Promise<WindowPrefs | null> {
  if (!isTauriRuntime()) return null;
  try {
    const invoke = getInvoke();
    if (!invoke) return null;
    return (await invoke("vybz_window_prefs_get")) as WindowPrefs;
  } catch {
    return null;
  }
}

export async function invokeWindowPrefsSet(prefs: WindowPrefs): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const invoke = getInvoke();
    if (!invoke) return false;
    await invoke("vybz_window_prefs_set", { prefs });
    return true;
  } catch {
    return false;
  }
}

export async function invokeSecureSet(key: string, value: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const invoke = getInvoke();
    if (!invoke) return false;
    await invoke("vybz_secure_set", { key, value });
    return true;
  } catch {
    return false;
  }
}

export async function invokeSecureGet(key: string): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const invoke = getInvoke();
    if (!invoke) return null;
    const v = await invoke("vybz_secure_get", { key });
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function invokeSecureClear(key?: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const invoke = getInvoke();
    if (!invoke) return false;
    await invoke("vybz_secure_clear", { key: key ?? null });
    return true;
  } catch {
    return false;
  }
}

function getInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
  const g = globalThis as {
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };
  };
  return g.__TAURI__?.core?.invoke ?? null;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/** @deprecated prefer isTauriRuntime */
export const isTauri = isTauriRuntime;
