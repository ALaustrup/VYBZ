/**
 * Stem Maker V1 (OR-019) — assemble exported stems into a measured ZIP set.
 * Does not auto-add to Library. No AI separation.
 */

import { useEffect, useRef, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { workingTrackAsFile } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import {
  STEM_MAKER_VERSION,
  inferStemRole,
} from "@/features/stems/stemManifest";
import {
  assembleStemFromFile,
  buildStemSetZip,
  type AssembledStem,
} from "@/features/stems/stemAssemble";
import {
  ForgeDropzone,
  ForgeEmptyWorkingSet,
  ToolWorkbench,
} from "@/components/ToolWorkbench";

function fmtDb(n: number): string {
  return `${n.toFixed(1)} dBFS`;
}

export function StemMakerPage() {
  const { showToast } = useSession();
  const [title, setTitle] = useState("untitled-stems");
  const [stems, setStems] = useState<AssembledStem[]>([]);
  const [busy, setBusy] = useState(false);
  const [applyDc, setApplyDc] = useState(false);
  const [applyPeak, setApplyPeak] = useState(false);

  useRegisterAppBar({ title: "Stems" }, []);

  async function onFiles(list: FileList | File[] | null) {
    const files = [...(list ?? [])].filter(isAudioFile);
    if (!files.length) {
      showToast("Choose audio stem files");
      return;
    }
    setBusy(true);
    try {
      const next: AssembledStem[] = [];
      for (const file of files) {
        const partial = await assembleStemFromFile(file, {
          applyDc,
          applyPeakSafety: applyPeak,
          role: inferStemRole(file.name),
        });
        next.push({ ...partial, fileName: "" });
      }
      setStems((prev) => [...prev, ...next]);
      showToast(`Added ${next.length} stem(s). Not in Library.`);
    } catch {
      showToast("Couldn't decode one or more stems");
    } finally {
      setBusy(false);
    }
  }

  const working = useWorkingTrack();
  const loadedWorkingId = useRef<string | null>(null);
  useEffect(() => {
    if (!working || stems.length || loadedWorkingId.current === working.id) return;
    const file = workingTrackAsFile(working);
    if (!file) return;
    loadedWorkingId.current = working.id;
    void onFiles([file]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from song workspace
  }, [working, stems.length]);

  async function exportZip() {
    if (!stems.length) {
      showToast("Add stems first");
      return;
    }
    setBusy(true);
    try {
      const { zip } = await buildStemSetZip({ title, stems });
      const blob = new Blob([new Uint8Array(zip)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "vybz-stems").replace(/[^\w.-]+/g, "_").slice(0, 48)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Stem set ZIP downloaded");
    } catch {
      showToast("ZIP export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolWorkbench
      eyebrow="Stems"
      title="Stem set"
      subtitle="Zip stems you already bounced. Not AI split."
      testId="stem-maker"
    >
      <div className="forge-glass forge-plasma relative grid gap-3 !rounded-2xl p-4 sm:grid-cols-2">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <label className="relative z-[1] block">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35"
            data-proc={STEM_MAKER_VERSION}
          >
            Set title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[rgb(var(--accent-rgb)/0.4)]"
            data-testid="stem-set-title"
          />
        </label>
        <div className="relative z-[1] flex flex-wrap items-end gap-4 pb-1 text-[12px] text-white/55">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyDc}
              onChange={(e) => setApplyDc(e.target.checked)}
              data-testid="stem-opt-dc"
            />
            Remove DC
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyPeak}
              onChange={(e) => setApplyPeak(e.target.checked)}
              data-testid="stem-opt-peak"
            />
            Peak safety
          </label>
        </div>
      </div>

      <ForgeDropzone
        label="Drop stems"
        hint="or click · multiple files"
        accept={AUDIO_ACCEPT}
        multiple
        busy={busy}
        inputTestId="stem-file-input"
        onFiles={(list) => void onFiles(list)}
      />

      <button
        type="button"
        disabled={!stems.length || busy}
        onClick={() => void exportZip()}
        className="btn btn-ghost w-fit px-4 py-2.5 text-sm disabled:opacity-40"
        data-testid="stem-export-zip"
      >
        <Download className="h-4 w-4" /> Export stem set ZIP
      </button>

      {stems.length === 0 ? (
        <ForgeEmptyWorkingSet
          title="No stems yet"
          detail="Import DAW-exported stems. Promote to Library is not available in V1 (by design)."
        />
      ) : (
        <ul className="space-y-2" data-testid="stem-list">
          {stems.map((s) => (
            <li
              key={s.id}
              className="forge-card grid grid-cols-[1fr_auto] gap-2 !rounded-xl px-3 py-2.5 text-[12px]"
            >
              <div>
                <label className="flex items-center gap-2 text-white/40">
                  role
                  <input
                    value={s.role}
                    onChange={(e) =>
                      setStems((list) =>
                        list.map((x) =>
                          x.id === s.id
                            ? {
                                ...x,
                                role: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
                              }
                            : x
                        )
                      )
                    }
                    className="w-40 bg-transparent text-white outline-none"
                    data-testid="stem-role-input"
                  />
                </label>
                <p className="mt-1 text-white/70">{s.sourceName}</p>
                <p className="mt-0.5 tabular-nums text-white/40">
                  peak {fmtDb(s.metrics.peakDbfs)} · rms {fmtDb(s.metrics.rmsDbfs)} ·{" "}
                  {s.metrics.durationSeconds.toFixed(2)}s · {s.metrics.sampleRate} Hz ·{" "}
                  {s.metrics.channels}ch
                  {s.corrections.length ? ` · ${s.corrections.join(", ")}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove stem"
                onClick={() => setStems((list) => list.filter((x) => x.id !== s.id))}
                className="rounded-lg p-1.5 text-white/35 hover:text-wild"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-white/30">
        {stems.length} stem(s) in working set · local only · promote to Library is not available in
        V1 (by design)
      </p>
    </ToolWorkbench>
  );
}
