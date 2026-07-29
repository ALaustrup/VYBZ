import type { ExportedFile, SelectedFile } from "@/contracts";

/**
 * Optional Tauri invoke shim. Safe to import when Tauri is absent —
 * all functions return null/false so the desktop bridge can fall back to web APIs.
 * Real `@tauri-apps/api` wiring lands when apps/desktop PoC dependencies are installed.
 */
export async function invokePickFiles(_kind: "audio" | "artwork"): Promise<SelectedFile[] | null> {
  if (!isTauriRuntime()) return null;
  // Command names reserved for Phase 2.D — PoC registers `vybz_ping` only.
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
    // Avoid hard dependency on @tauri-apps/api in the web package graph.
    const g = globalThis as {
      __TAURI__?: { core?: { invoke?: (cmd: string) => Promise<unknown> } };
    };
    const invoke = g.__TAURI__?.core?.invoke;
    if (!invoke) return null;
    const result = await invoke("vybz_ping");
    return typeof result === "string" ? result : String(result);
  } catch {
    return null;
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}
