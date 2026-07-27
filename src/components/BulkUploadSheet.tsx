import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown, ArrowUp, AudioLines, Globe, Loader2, Lock, Trash2, Upload, Users, X,
} from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { softUploadHint } from "@/components/ProBadge";
import {
  AUDIO_ACCEPT, audioMeta, computeWaveform, placeholderWaveform,
  sha256Hex, acousticSignature,
} from "@/lib/waveform";
import { readId3Tags, titleFromFilename } from "@/lib/id3Tags";
import { cx } from "@/lib/utils";
import type { PostAudience } from "@/types";

const MAX_AUDIO_BYTES = 1024 * 1024 * 1024;
const MAX_BATCH = 24;

function prettyBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

type RowStatus = "ready" | "uploading" | "done" | "error";

interface BulkRow {
  id: string;
  file: File;
  title: string;
  bpm: number | null;
  musicalKey: string | null;
  peaks: number[];
  duration: number;
  format: string;
  lossless: boolean;
  sampleRate: number;
  ext: string;
  status: RowStatus;
  error?: string;
}

/**
 * Studio multi-file release — same createDrop path as Compose, sequenced tracklist.
 * Shared credited artist stamps Official Artist claim evidence across the batch.
 */
export function BulkUploadSheet({
  open, onClose, onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { showToast, celebrate, profile } = useSession();
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [creditedArtist, setCreditedArtist] = useState("");
  const [batchTitle, setBatchTitle] = useState("");
  const [audience, setAudience] = useState<PostAudience>("public");
  const [license, setLicense] = useState("collab-only");
  const [ownershipClaim, setOwnershipClaim] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRows([]); setCreditedArtist(""); setBatchTitle("");
    setAudience("public"); setLicense("collab-only"); setOwnershipClaim(false);
    setDecoding(false); setPosting(false); setProgressLabel("");
  }, [open]);

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) => f.size > 0);
    if (!incoming.length) return;
    const room = MAX_BATCH - rows.length;
    if (room <= 0) { showToast(`Max ${MAX_BATCH} tracks per batch.`); return; }
    const take = incoming.slice(0, room);
    const oversized = take.find((f) => f.size > MAX_AUDIO_BYTES);
    if (oversized) {
      showToast(`${oversized.name} is ${prettyBytes(oversized.size)} — max is 1 GB.`);
      return;
    }
    const softHit = take.find((f) => softUploadHint(f.size, profile?.profile));
    if (softHit) {
      const hint = softUploadHint(softHit.size, profile?.profile);
      if (hint) showToast(hint);
    }
    setDecoding(true);
    try {
      const next: BulkRow[] = [];
      for (const file of take) {
        const [tags, meta, wf] = await Promise.all([
          readId3Tags(file),
          Promise.resolve(audioMeta(file)),
          computeWaveform(file, 400, true),
        ]);
        if (tags.artworkUrl) URL.revokeObjectURL(tags.artworkUrl);
        if (!creditedArtist && tags.artist) setCreditedArtist(tags.artist.slice(0, 80));
        if (!batchTitle && tags.album) setBatchTitle(tags.album.slice(0, 80));
        next.push({
          id: crypto.randomUUID(),
          file,
          title: (tags.title || titleFromFilename(file.name)).slice(0, 80),
          bpm: tags.bpm ?? wf?.bpm ?? null,
          musicalKey: wf?.key ?? null,
          peaks: wf?.peaks ?? placeholderWaveform(Math.floor(Math.random() * 1e6), 400),
          duration: wf?.duration ?? 0,
          format: meta.format,
          lossless: meta.lossless,
          sampleRate: wf?.sampleRate ?? 0,
          ext: (file.name.split(".").pop() || "audio").toLowerCase(),
          status: "ready",
        });
      }
      setRows((r) => [...r, ...next]);
    } catch {
      showToast("Couldn't read one or more files.");
    } finally {
      setDecoding(false);
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (files?.length) void addFiles(files);
  }

  function move(id: string, dir: -1 | 1) {
    setRows((list) => {
      const i = list.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = list.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function patchTitle(id: string, title: string) {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, title: title.slice(0, 80) } : r)));
  }

  function remove(id: string) {
    setRows((list) => list.filter((r) => r.id !== id));
  }

  async function release() {
    if (!rows.length || posting) return;
    if (!ownershipClaim) {
      showToast("Confirm you own or are licensed to upload this audio.");
      return;
    }
    setPosting(true);
    const artist = creditedArtist.trim() || undefined;
    const batchId = await api.createReleaseBatch({
      title: batchTitle.trim() || rows[0]?.title || "Release",
      creditedArtist: artist,
    });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgressLabel(`${i + 1} / ${rows.length} · ${row.title}`);
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: "uploading" } : r)));
      try {
        const path = await api.uploadAudio(row.file, row.ext);
        if (!path) throw new Error("upload");
        const [sha256, fingerprint] = await Promise.all([
          sha256Hex(row.file).catch(() => undefined),
          acousticSignature(row.peaks).catch(() => undefined),
        ]);
        const drop = await api.createDrop({
          title: row.title.trim() || undefined,
          seed: Math.floor(Math.random() * 1e6),
          assetKind: "track",
          audioUrl: path,
          waveform: row.peaks,
          durationSec: row.duration,
          bpm: row.bpm ?? undefined,
          musicalKey: row.musicalKey || undefined,
          audioFormat: row.format,
          sampleRate: row.sampleRate || undefined,
          lossless: row.lossless,
          license,
          sha256,
          fingerprint,
          fx: "glow",
          audience,
          creditedArtist: artist,
          releaseBatchId: batchId ?? undefined,
        });
        if (!drop) throw new Error("create");
        ok++;
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: "done" } : r)));
      } catch {
        fail++;
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: "error", error: "Failed" } : r)));
      }
    }
    setPosting(false);
    setProgressLabel("");
    if (ok > 0) {
      celebrate(ok === 1 ? "Drop released" : `${ok} drops released`);
      onPosted();
      if (fail === 0) onClose();
      else showToast(`${fail} track${fail === 1 ? "" : "s"} failed — retry or remove them.`);
    } else {
      showToast("Couldn't release this batch.");
    }
  }

  const readyCount = rows.filter((r) => r.status === "ready" || r.status === "error").length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={posting ? undefined : onClose} className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl"
            data-dark-stage
          >
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">Bulk upload</h2>
                <p className="text-[12px] text-white/40">Release a sequenced tracklist from Studio.</p>
              </div>
              <button type="button" onClick={onClose} disabled={posting} aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90 disabled:opacity-40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
              <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} multiple onChange={onPick} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={decoding || posting || rows.length >= MAX_BATCH}
                className="btn btn-primary mb-4 w-full py-3 disabled:opacity-60">
                {decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {decoding ? "Reading tags…" : rows.length ? "Add more audio" : "Choose audio files"}
              </button>

              <div className="mb-3 space-y-2">
                <input value={batchTitle} onChange={(e) => setBatchTitle(e.target.value.slice(0, 80))}
                  placeholder="Release title (optional)"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                <input value={creditedArtist} onChange={(e) => setCreditedArtist(e.target.value.slice(0, 80))}
                  placeholder="Credited artist (shared across batch)"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                <p className="text-[11px] text-white/35">Same credited name on ≥2 drops unlocks Official Artist claim.</p>
              </div>

              <div className="mb-3 flex gap-1.5">
                <button type="button" onClick={() => setAudience("public")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "public" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Globe className="h-3.5 w-3.5" /> Public</button>
                <button type="button" onClick={() => setAudience("followers")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "followers" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Users className="h-3.5 w-3.5" /> Network</button>
                <button type="button" onClick={() => setAudience("private")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "private" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Lock className="h-3.5 w-3.5" /> Private</button>
              </div>

              <div className="mb-4 flex gap-4">
                {([["collab-only", "Collab"], ["credit-required", "Credit"], ["free", "Free"]] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setLicense(id)}
                    className={cx("relative pb-1.5 text-[12px] font-medium transition", license === id ? "text-white" : "text-white/40 hover:text-white/70")}>
                    {label}
                    {license === id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
                  </button>
                ))}
              </div>

              <label className="mb-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
                <input
                  type="checkbox"
                  checked={ownershipClaim}
                  onChange={(e) => setOwnershipClaim(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/30"
                />
                <span className="text-[12px] leading-snug text-white/70">
                  I own this audio or have a license to upload it. I understand VYBZ may remove
                  infringing material and terminate repeat infringers (see{" "}
                  <a href="/legal/dmca" className="text-veil-200 underline" onClick={(e) => e.stopPropagation()}>DMCA</a>).
                </span>
              </label>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AudioLines className="h-8 w-8 text-white/15" />
                  <p className="text-[13px] text-white/40">Pick multiple masters — ID3 fills titles & artist.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {rows.map((r, idx) => (
                    <li key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-5 shrink-0 text-center font-mono text-[11px] text-white/30">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <input value={r.title} disabled={posting || r.status === "done"}
                            onChange={(e) => patchTitle(r.id, e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/35 disabled:opacity-60" />
                          <p className="mt-0.5 text-[11px] text-white/35">
                            {prettyBytes(r.file.size)}
                            {r.bpm ? ` · ${r.bpm} BPM` : ""}
                            {r.status === "uploading" ? " · uploading…" : ""}
                            {r.status === "done" ? " · done" : ""}
                            {r.status === "error" ? " · failed" : ""}
                          </p>
                        </div>
                        {!posting && r.status !== "done" && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button type="button" onClick={() => move(r.id, -1)} aria-label="Move up" className="rounded-lg p-1.5 text-white/40 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => move(r.id, 1)} aria-label="Move down" className="rounded-lg p-1.5 text-white/40 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => remove(r.id)} aria-label="Remove" className="rounded-lg p-1.5 text-white/40 hover:text-wild"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] bg-ink-900/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              {progressLabel && <p className="mb-2 text-[11px] text-white/50">{progressLabel}</p>}
              <button type="button" onClick={() => void release()}
                disabled={!rows.length || posting || !ownershipClaim || (readyCount === 0 && rows.every((r) => r.status === "done"))}
                className="btn btn-primary w-full py-3.5 disabled:opacity-50">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Release {rows.length || ""} track{rows.length === 1 ? "" : "s"}</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
