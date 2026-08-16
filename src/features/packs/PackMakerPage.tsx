/**
 * OR-038 — Sample Pack Creator: Library multi-select + local drop → measured ZIP → Store.
 * Pack working set is never auto-ingested into Library (isolation rule).
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Library, Store, Trash2 } from "lucide-react";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { fetchLibraryTrackMaster } from "@/features/workspace/loadLibraryTrack";
import type { Drop } from "@/types";
import {
  PACK_MAKER_VERSION,
  assembleSampleFromBlob,
  assembleSampleFromFile,
  buildPackZip,
  type AssembledSample,
} from "@/features/packs/packAssemble";
import type { PackSampleKind } from "@/features/packs/packManifest";
import { savePackHandoff } from "@/features/packs/packHandoff";
import { getPackMakerSession, setPackMakerSession } from "@/features/packs/packMakerSession";
import {
  ForgeDropzone,
  ForgeEmptyWorkingSet,
  ToolWorkbench,
} from "@/components/ToolWorkbench";

function fmtDb(n: number): string {
  return `${n.toFixed(1)} dBFS`;
}

const KINDS: PackSampleKind[] = ["oneshot", "loop", "other"];

function dropDisplayName(d: Drop): string {
  const base = (d.title || "untitled").trim() || "untitled";
  const ext = d.audioFormat ? `.${d.audioFormat.replace(/^\./, "")}` : ".wav";
  return base.toLowerCase().endsWith(ext.toLowerCase()) ? base : `${base}${ext}`;
}

export function PackMakerPage() {
  const navigate = useNavigate();
  const { showToast, userId } = useSession();
  const seeded = getPackMakerSession();
  const [title, setTitle] = useState(seeded.title);
  const [samples, setSamples] = useState<AssembledSample[]>(() => seeded.samples);
  const [busy, setBusy] = useState(false);
  const [lastZipSha, setLastZipSha] = useState<string | null>(seeded.lastZipSha);
  const [lastContentSha, setLastContentSha] = useState<string | null>(seeded.lastContentSha);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryDrops, setLibraryDrops] = useState<Drop[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedDropIds, setSelectedDropIds] = useState<Set<string>>(() => new Set());

  useRegisterAppBar({ title: "Pack Maker", subtitle: "Assemble" }, []);

  useEffect(() => {
    setPackMakerSession({ title, samples, lastZipSha, lastContentSha });
  }, [title, samples, lastZipSha, lastContentSha]);

  const loadLibrary = useCallback(async () => {
    if (!userId) {
      showToast("Sign in to add from Library");
      return;
    }
    setLibraryLoading(true);
    try {
      const drops = await api.dropsBy(userId, 80);
      setLibraryDrops(drops.filter((d) => !!d.audioUrl));
    } catch {
      showToast("Couldn't load Library");
      setLibraryDrops([]);
    } finally {
      setLibraryLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    if (!libraryOpen) return;
    void loadLibrary();
  }, [libraryOpen, loadLibrary]);

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

  async function addFromLibrary() {
    const chosen = libraryDrops.filter((d) => selectedDropIds.has(d.id));
    if (!chosen.length) {
      showToast("Select Library tracks with audio");
      return;
    }
    setBusy(true);
    let added = 0;
    let skipped = 0;
    try {
      const next: AssembledSample[] = [];
      for (const drop of chosen) {
        // Shared retrieval, so a fix to how a master is reached reaches every
        // surface at once rather than only the desks.
        const got = await fetchLibraryTrackMaster(drop);
        if (!got.ok) {
          skipped++;
          continue;
        }
        try {
          next.push(await assembleSampleFromBlob(got.blob, dropDisplayName(drop)));
          added++;
        } catch {
          skipped++;
        }
      }
      if (next.length) setSamples((prev) => [...prev, ...next]);
      setSelectedDropIds(new Set());
      if (added && skipped) showToast(`Added ${added} from Library · ${skipped} unavailable (skipped)`);
      else if (added) showToast(`Added ${added} from Library — pack set stays out of catalog auto-ingest`);
      else showToast("No Library audio could be fetched");
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
    showToast("Handed off to storefront — ZIP uploads into the draft");
    navigate("/tools/packs/new");
  }

  function setKind(id: string, kind: PackSampleKind) {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, kind } : s)));
  }

  function toggleDrop(id: string) {
    setSelectedDropIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ToolWorkbench
      eyebrow="Packs"
      title="Pack Maker"
      subtitle={`Build packs from Library and local files. Measured ZIP + checksummed manifest. Store handoff uploads the real ZIP. Never auto-added to Library. Proc ${PACK_MAKER_VERSION}.`}
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="pack-library-toggle"
          disabled={busy}
          onClick={() => setLibraryOpen((o) => !o)}
          className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-40"
        >
          <Library className="h-4 w-4" /> {libraryOpen ? "Hide Library" : "Add from Library"}
        </button>
      </div>

      {libraryOpen ? (
        <div
          className="forge-glass relative space-y-3 !rounded-2xl p-4"
          data-testid="pack-library-picker"
          data-no-library-drop
        >
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <p className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Your Library
          </p>
          {libraryLoading ? (
            <p className="relative z-[1] text-[12px] text-white/45">Loading…</p>
          ) : libraryDrops.length === 0 ? (
            <p className="relative z-[1] text-[12px] text-white/45">
              No Library audio with a reachable URL. Upload tracks in Library first — we never invent samples.
            </p>
          ) : (
            <ul className="relative z-[1] max-h-56 space-y-1 overflow-y-auto">
              {libraryDrops.map((d) => (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-white/80 hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={selectedDropIds.has(d.id)}
                      onChange={() => toggleDrop(d.id)}
                      data-testid={`pack-library-drop-${d.id}`}
                    />
                    <span className="min-w-0 truncate">{d.title || "Untitled"}</span>
                    {d.durationSec != null ? (
                      <span className="shrink-0 text-[11px] text-white/35">{d.durationSec.toFixed(1)}s</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            data-testid="pack-library-add"
            disabled={busy || selectedDropIds.size === 0}
            onClick={() => void addFromLibrary()}
            className="relative z-[1] btn btn-primary px-3 py-2 text-sm disabled:opacity-40"
          >
            Add selected to pack
          </button>
        </div>
      ) : null}

      <ForgeDropzone
        label="Drop samples"
        hint="or click to choose · multiple WAV / AIFF / FLAC / MP3 · local fallback"
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
          detail="Add from Library or drop oneshots and loops. Pack working set stays local — never auto-ingested into Library."
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
