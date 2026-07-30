/**
 * Waveform preview secondary window (Phase 12 Desktop Beta).
 * Opened via View ▸ Waveform preview / vybz_open_waveform_preview.
 */
import { useEffect, useState } from "react";

async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  const g = globalThis as {
    __TAURI__?: { core?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> } };
  };
  const invoke = g.__TAURI__?.core?.invoke;
  if (!invoke) return null;
  try {
    return (await invoke(cmd, args)) as T;
  } catch {
    return null;
  }
}

export function WaveformPreviewPage() {
  const [buildHash, setBuildHash] = useState<string>("…");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hash = await invokeCmd<string>("vybz_build_hash");
      if (!cancelled) setBuildHash(hash ?? "web-preview");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--fg)] p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="waveform-preview-title">
            Waveform preview
          </h1>
          <p className="text-sm opacity-70" data-testid="waveform-build-hash">
            Build {buildHash}
          </p>
        </div>
        <button
          type="button"
          className="glass-chip px-3 py-1.5 text-sm"
          onClick={() => void invokeCmd("vybz_close_waveform_preview")}
        >
          Close
        </button>
      </header>
      <div
        className="flex-1 rounded-xl border border-white/10 bg-black/40 relative overflow-hidden min-h-[240px]"
        aria-label="Waveform canvas"
      >
        <svg className="absolute inset-0 w-full h-full opacity-80" viewBox="0 0 960 240" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={Array.from({ length: 97 }, (_, i) => {
              const x = i * 10;
              const y = 120 + Math.sin(i / 4) * 40 + Math.sin(i / 11) * 20;
              return `${x},${y}`;
            }).join(" ")}
          />
        </svg>
      </div>
    </div>
  );
}

export default WaveformPreviewPage;
