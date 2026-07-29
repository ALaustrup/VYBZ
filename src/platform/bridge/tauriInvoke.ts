import type { ExportedFile, SelectedFile } from "@/contracts";
import type { PortableAudioAnalysis } from "@vybz/processing/waveform";

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
      engine: "native",
      processingVersion: String(raw.processingVersion ?? "phase4.waveform.1"),
    };
  } catch {
    return null;
  }
}

function getInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
  const g = globalThis as {
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };
  };
  return g.__TAURI__?.core?.invoke ?? null;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}
