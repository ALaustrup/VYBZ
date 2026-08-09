/**
 * Stem Maker V1 (OR-019) — assemble exported stems into a measured ZIP set.
 * Does not auto-add to Library. No AI separation.
 */

import { useState } from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import {
  STEM_MAKER_VERSION,
  inferStemRole,
} from "@/features/stems/stemManifest";
import {
  assembleStemFromFile,
  buildStemSetZip,
  type AssembledStem,
} from "@/features/stems/stemAssemble";

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

  useRegisterAppBar({ title: "Stem Maker", subtitle: "Assemble" }, []);

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
      showToast(`Added ${next.length} stem(s) — not added to Library`);
    } catch {
      showToast("Couldn't decode one or more stems");
    } finally {
      setBusy(false);
    }
  }

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
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="stem-maker">
      <p className="mb-4 text-[13px] text-white/45">
        Assemble producer-exported stems into a labeled WAV set with measured peak/RMS and a
        checksummed manifest. Optional DC / peak-safety from Correct. Not AI separation. Stems are
        not auto-added to Library or catalog. Proc {STEM_MAKER_VERSION}.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] uppercase text-white/35">Set title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
            data-testid="stem-set-title"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3 pb-1 text-[12px] text-white/55">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyDc}
              onChange={(e) => setApplyDc(e.target.checked)}
              data-testid="stem-opt-dc"
            />
            Apply DC remove
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyPeak}
              onChange={(e) => setApplyPeak(e.target.checked)}
              data-testid="stem-opt-peak"
            />
            Apply peak safety
          </label>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <label className="btn btn-primary cursor-pointer px-4 py-2.5 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Add stems
          <input
            type="file"
            multiple
            accept={AUDIO_ACCEPT}
            className="hidden"
            data-testid="stem-file-input"
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              void onFiles(files);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!stems.length || busy}
          onClick={() => void exportZip()}
          className="btn btn-ghost px-4 py-2.5 text-sm disabled:opacity-40"
          data-testid="stem-export-zip"
        >
          <Download className="h-4 w-4" /> Export stem set ZIP
        </button>
      </div>

      {stems.length > 0 && (
        <ul className="space-y-2" data-testid="stem-list">
          {stems.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]"
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
                            ? { ...x, role: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() }
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

      <p className="mt-6 text-[11px] text-white/30">
        {stems.length} stem(s) in working set · local only · promote to Library is not available in
        V1 (by design)
      </p>
    </div>
  );
}
