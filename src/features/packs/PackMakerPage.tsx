/**
 * OR-020 V1 — Sample Pack Creator (assemble measured ZIP → optional storefront handoff).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Store, Trash2, Upload } from "lucide-react";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import {
  PACK_MAKER_VERSION,
  assembleSampleFromFile,
  buildPackZip,
  type AssembledSample,
} from "@/features/packs/packAssemble";
import { savePackHandoff } from "@/features/packs/packHandoff";

function fmtDb(n: number): string {
  return `${n.toFixed(1)} dBFS`;
}

export function PackMakerPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [title, setTitle] = useState("untitled-pack");
  const [samples, setSamples] = useState<AssembledSample[]>([]);
  const [busy, setBusy] = useState(false);

  useRegisterAppBar({ title: "Pack Maker", subtitle: "Assemble" }, []);

  async function onFiles(list: FileList | File[] | null) {
    const files = [...(list ?? [])].filter(isAudioFile);
    if (!files.length) {
      showToast("Choose audio sample files");
      return;
    }
    setBusy(true);
    try {
      const next: AssembledSample[] = [];
      for (const file of files) next.push(await assembleSampleFromFile(file));
      setSamples((prev) => [...prev, ...next]);
      showToast(`Added ${next.length} sample(s) — not added to Library`);
    } catch {
      showToast("Couldn't decode one or more samples");
    } finally {
      setBusy(false);
    }
  }

  async function exportZip(): Promise<Blob | null> {
    if (!samples.length) {
      showToast("Add samples first");
      return null;
    }
    setBusy(true);
    try {
      const { zip } = await buildPackZip({ title, samples });
      return new Blob([new Uint8Array(zip)], { type: "application/zip" });
    } catch {
      showToast("ZIP export failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    const blob = await exportZip();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "vybz-pack").replace(/[^\w.-]+/g, "_").slice(0, 48)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Pack ZIP downloaded");
  }

  async function onStorefront() {
    const blob = await exportZip();
    if (!blob) return;
    savePackHandoff({
      title,
      fileName: `${(title || "vybz-pack").replace(/[^\w.-]+/g, "_").slice(0, 48)}.zip`,
      blob,
    });
    showToast("Handed off to storefront — upload the ZIP on the next screen");
    navigate("/tools/packs/new");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="pack-maker">
      <p className="mb-4 text-[13px] text-white/45">
        Assemble samples into a foldered ZIP with measured peak/RMS and a checksummed manifest.
        Optional handoff to the existing storefront uploader. Not auto-added to Library. Proc{" "}
        {PACK_MAKER_VERSION}.
      </p>

      <label className="block mb-4">
        <span className="text-[10px] uppercase text-white/35">Pack title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
          data-testid="pack-title"
        />
      </label>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="btn btn-primary cursor-pointer px-4 py-2.5 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Add samples
          <input
            type="file"
            accept={AUDIO_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          data-testid="pack-download"
          disabled={!samples.length || busy}
          onClick={() => void onDownload()}
          className="btn btn-ghost px-3 py-2 text-sm"
        >
          <Download className="h-4 w-4" /> Download ZIP
        </button>
        <button
          type="button"
          data-testid="pack-storefront"
          disabled={!samples.length || busy}
          onClick={() => void onStorefront()}
          className="btn btn-ghost px-3 py-2 text-sm"
        >
          <Store className="h-4 w-4" /> To storefront
        </button>
      </div>

      {samples.length > 0 && (
        <ul className="space-y-2" data-testid="pack-sample-list">
          {samples.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white/90">{s.sourceName}</p>
                <p className="text-[11px] text-white/40">
                  {s.kind} · peak {fmtDb(s.metrics.peakDbfs)} · {s.metrics.durationSeconds.toFixed(2)}s
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${s.sourceName}`}
                onClick={() => setSamples((prev) => prev.filter((x) => x.id !== s.id))}
                className="btn btn-ghost p-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
