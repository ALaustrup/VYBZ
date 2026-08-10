/**
 * OR-020 — Sample Pack Creator (assemble measured ZIP → optional storefront handoff).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Store, Trash2 } from "lucide-react";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import {
  PACK_MAKER_VERSION,
  assembleSampleFromFile,
  buildPackZip,
  type AssembledSample,
} from "@/features/packs/packAssemble";
import type { PackSampleKind } from "@/features/packs/packManifest";
import { savePackHandoff } from "@/features/packs/packHandoff";
import {
  ForgeDropzone,
  ForgeEmptyWorkingSet,
  ToolWorkbench,
} from "@/components/ToolWorkbench";

function fmtDb(n: number): string {
  return `${n.toFixed(1)} dBFS`;
}

const KINDS: PackSampleKind[] = ["oneshot", "loop", "other"];

export function PackMakerPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [title, setTitle] = useState("untitled-pack");
  const [samples, setSamples] = useState<AssembledSample[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastZipSha, setLastZipSha] = useState<string | null>(null);
  const [lastContentSha, setLastContentSha] = useState<string | null>(null);

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
      const { zip, manifest, zipSha256 } = await buildPackZip({ title, samples });
      setLastZipSha(zipSha256);
      setLastContentSha(manifest.contentSha256);
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

  function setKind(id: string, kind: PackSampleKind) {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, kind } : s)));
  }

  return (
    <ToolWorkbench
      eyebrow="Packs"
      title="Pack Maker"
      subtitle={`Assemble samples into a foldered ZIP with measured peak/RMS and a checksummed manifest. Optional storefront handoff. Not auto-added to Library. Proc ${PACK_MAKER_VERSION}.`}
      testId="pack-maker"
    >
      <label className="forge-glass forge-plasma relative block !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <span className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Pack title
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          className="relative z-[1] mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[rgb(var(--accent-rgb)/0.4)]"
          data-testid="pack-title"
        />
      </label>

      <ForgeDropzone
        label="Drop samples"
        hint="or click to choose · multiple WAV / AIFF / FLAC / MP3"
        accept={AUDIO_ACCEPT}
        multiple
        busy={busy}
        onFiles={(list) => void onFiles(list)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="pack-download"
          disabled={!samples.length || busy}
          onClick={() => void onDownload()}
          className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Download ZIP
        </button>
        <button
          type="button"
          data-testid="pack-storefront"
          disabled={!samples.length || busy}
          onClick={() => void onStorefront()}
          className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-40"
        >
          <Store className="h-4 w-4" /> To storefront
        </button>
      </div>

      {(lastZipSha || lastContentSha) && (
        <p className="text-[11px] text-white/40" data-testid="pack-checksums">
          {lastContentSha ? `Content SHA ${lastContentSha.slice(0, 16)}…` : ""}
          {lastZipSha ? ` · ZIP SHA ${lastZipSha.slice(0, 16)}…` : ""}
        </p>
      )}

      {samples.length === 0 ? (
        <ForgeEmptyWorkingSet
          title="No samples yet"
          detail="Drop oneshots and loops into the stage. Working set stays local — never auto-ingested into Library."
        />
      ) : (
        <ul className="space-y-2" data-testid="pack-sample-list">
          {samples.map((s) => (
            <li
              key={s.id}
              className="forge-card flex items-center gap-3 !rounded-xl px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white/90">{s.sourceName}</p>
                <p className="text-[11px] text-white/40">
                  peak {fmtDb(s.metrics.peakDbfs)} · {s.metrics.durationSeconds.toFixed(2)}s
                </p>
              </div>
              <label className="shrink-0 text-[11px] text-white/45">
                <span className="sr-only">Kind for {s.sourceName}</span>
                <select
                  value={s.kind}
                  onChange={(e) => setKind(s.id, e.target.value as PackSampleKind)}
                  className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white"
                  data-testid={`pack-kind-${s.id}`}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
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
    </ToolWorkbench>
  );
}
