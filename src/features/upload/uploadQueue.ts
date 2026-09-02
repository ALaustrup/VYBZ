/**
 * The upload queue — bytes move the moment a file lands.
 *
 * Metadata is something the artist fills in while the upload runs, not a gate
 * they clear before it starts. Enqueuing a file starts its upload immediately;
 * the form then edits the same item the network is already working on, and
 * Release only creates the drop rows because the bytes are already up.
 *
 * State lives in an external store (same shape as `sparkStatusStore`) so a row
 * can re-render on its own progress without the whole sheet re-rendering on
 * every byte.
 */
import { useSyncExternalStore } from "react";
import * as api from "@/lib/api";
import type { NewDrop, UploadFailureReason } from "@/lib/api";
import { isIngestibleCreativeFile } from "@/features/upload/creativeFile";
import { readId3Tags, titleFromFilename, type Id3Tags } from "@/lib/id3Tags";
import { MUSICAL_KEYS } from "@/lib/profileFields";
import { hashBlobGuarded } from "@/lib/sha256Worker";
import { hintsFromFilename } from "@/features/upload/filenameHints";
import {
  audioMeta,
  computeWaveform,
  isAudioFile,
  placeholderWaveform,
  type WaveformResult,
} from "@/lib/waveform";
import type { PostAudience, ReleaseType } from "@/types";

/** Two at a time: enough to keep the pipe full, not enough to starve any one file. */
export const MAX_CONCURRENT_UPLOADS = 2;

/** Same ceiling the rest of intake enforces. */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

/** Buckets in the waveform preview stored with the asset. */
const WAVEFORM_BUCKETS = 800;

export type UploadStatus =
  /** Queued, or extracting audio from a video container. No bytes sent yet. */
  | "reading"
  /** Bytes are moving. `percent` is bytes handed to the network, not acceptance. */
  | "uploading"
  /** Storage accepted the bytes; the local decode is still measuring the file. */
  | "analyzing"
  /** Bytes are up and measured. Waiting for the artist to release. */
  | "ready"
  | "failed"
  | "released";

/** Everything a row shows. The first five are editable; the rest are measured. */
export interface UploadMeta {
  title: string;
  creditedArtist: string;
  album: string;
  bpm: string;
  musicalKey: string;
  durationSec: number;
  peaks: number[];
  format: string;
  sampleRate: number;
  lossless: boolean;
}

export type EditableMetaField = "title" | "creditedArtist" | "album" | "bpm" | "musicalKey";

export interface UploadItem {
  id: string;
  file: File;
  /** Display name — the file name, which never changes under the artist. */
  name: string;
  status: UploadStatus;
  /** 0..100 bytes handed to the network. 100 is not the same as accepted. */
  percent: number;
  error: string | null;
  /** Storage path, set only once the server accepted the bytes. */
  path: string | null;
  /** Provenance hash, absent when it could not be measured in time. */
  sha256?: string;
  dropId: string | null;
  seed: number;
  /** Fields the artist typed in. Auto-detected values must never overwrite these. */
  touched: readonly EditableMetaField[];
  /** Fields that came from the file itself, so the row can say so. */
  autoFilled: readonly EditableMetaField[];
  meta: UploadMeta;
  /** Declared caption. Used for generated-work disclosure. */
  body?: string;
}

/* ------------------------------------------------------------------------- */
/* Pure logic                                                                 */
/* ------------------------------------------------------------------------- */

export function createUploadItem(file: File, id: string, seed: number): UploadItem {
  const meta = audioMeta(file);
  // The name is the most reliable thing we have about a sample-pack file, and
  // it is already in hand — no decode, no waiting.
  const hint = hintsFromFilename(file.name);
  const autoFilled: EditableMetaField[] = [];
  if (hint.bpm) autoFilled.push("bpm");
  if (hint.musicalKey) autoFilled.push("musicalKey");
  return {
    id,
    file,
    name: file.name,
    status: "reading",
    percent: 0,
    error: null,
    path: null,
    dropId: null,
    seed,
    touched: [],
    autoFilled,
    meta: {
      title: titleFromFilename(file.name).slice(0, 80),
      creditedArtist: "",
      album: "",
      bpm: hint.bpm ? String(hint.bpm) : "",
      musicalKey: hint.musicalKey ?? "",
      durationSec: 0,
      peaks: placeholderWaveform(seed, WAVEFORM_BUCKETS),
      format: meta.format,
      sampleRate: 0,
      lossless: isAudioFile(file) ? meta.lossless : false,
    },
  };
}

/** Audio, image, video, or an allowed file. Video stays video — extract lives in Convert. */
export function isIngestibleFile(file: File): boolean {
  return isIngestibleCreativeFile(file);
}

export function collectUploadFiles(list: FileList | File[] | null | undefined): {
  files: File[];
  skippedNonAudio: number;
  skippedEmpty: number;
  skippedOversize: number;
} {
  const incoming = list ? Array.from(list) : [];
  let skippedNonAudio = 0;
  let skippedEmpty = 0;
  let skippedOversize = 0;
  const files: File[] = [];
  for (const f of incoming) {
    if (!f || f.size <= 0) {
      skippedEmpty++;
      continue;
    }
    if (!isIngestibleFile(f)) {
      skippedNonAudio++;
      continue;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      skippedOversize++;
      continue;
    }
    files.push(f);
  }
  return { files, skippedNonAudio, skippedEmpty, skippedOversize };
}

function withMeta(
  item: UploadItem,
  field: EditableMetaField,
  value: string,
): UploadItem {
  if (item.touched.includes(field)) return item;
  if (!value) return item;
  return {
    ...item,
    meta: { ...item.meta, [field]: value },
    autoFilled: item.autoFilled.includes(field) ? item.autoFilled : [...item.autoFilled, field],
  };
}

/** Container tags land within a second of the drop; they fill only untouched fields. */
export function applyTags(item: UploadItem, tags: Id3Tags): UploadItem {
  let next = item;
  if (tags.title) next = withMeta(next, "title", tags.title.slice(0, 80));
  if (tags.artist) next = withMeta(next, "creditedArtist", tags.artist.slice(0, 80));
  if (tags.album) next = withMeta(next, "album", tags.album.slice(0, 80));
  if (tags.bpm) next = withMeta(next, "bpm", String(tags.bpm));
  return next;
}

/**
 * Below this, tempo and key detection is not evidence.
 *
 * Measured on a 43-file pack: sixteen loops of 5.5 seconds, every one labelled
 * 174 BPM by its own filename, were detected as 77 through 156. Not one right,
 * and not even consistent halves or doubles — noise reported as measurement.
 *
 * A duration floor is a proxy for confidence, not confidence itself; the
 * analyser exposes no certainty to check. It is set conservatively because a
 * wrong tempo is worse than an empty field: an empty field asks you, and a
 * wrong one does not.
 */
export const MIN_ANALYSIS_SEC = 20;

/** Decode results: measured values always land, editable ones respect edits. */
export function applyAnalysis(item: UploadItem, wf: WaveformResult | null): UploadItem {
  if (!wf) return item;
  let next: UploadItem = {
    ...item,
    meta: {
      ...item.meta,
      peaks: wf.peaks.length ? wf.peaks : item.meta.peaks,
      durationSec: wf.duration || item.meta.durationSec,
      sampleRate: wf.sampleRate || item.meta.sampleRate,
    },
  };

  // Detection is the last word, not the first: it fills what the filename and
  // the container tags could not, and only on files long enough to hold the
  // evidence.
  const seconds = wf.duration || item.meta.durationSec;
  if (seconds && seconds < MIN_ANALYSIS_SEC) return next;
  if (wf.bpm && !next.meta.bpm) next = withMeta(next, "bpm", String(wf.bpm));
  if (wf.key && !next.meta.musicalKey && MUSICAL_KEYS.includes(wf.key)) {
    next = withMeta(next, "musicalKey", wf.key);
  }
  return next;
}

export function editMeta(
  item: UploadItem,
  field: EditableMetaField,
  value: string,
): UploadItem {
  return {
    ...item,
    meta: { ...item.meta, [field]: value },
    touched: item.touched.includes(field) ? item.touched : [...item.touched, field],
    autoFilled: item.autoFilled.filter((f) => f !== field),
  };
}

export function patchItems(
  items: UploadItem[],
  id: string,
  patch: Partial<UploadItem> | ((item: UploadItem) => UploadItem),
): UploadItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    changed = true;
    return typeof patch === "function" ? patch(item) : { ...item, ...patch };
  });
  return changed ? next : items;
}

/**
 * Which items should start now. Uploads are capped so a large batch cannot
 * saturate the connection and make every row crawl.
 */
export function nextUploadIds(
  items: UploadItem[],
  runningIds: readonly string[],
  limit = MAX_CONCURRENT_UPLOADS,
): string[] {
  const free = Math.max(0, limit - runningIds.length);
  if (free === 0) return [];
  return items
    .filter((i) => i.status === "reading" && !runningIds.includes(i.id))
    .slice(0, free)
    .map((i) => i.id);
}

/** Bytes are up, so releasing is only a row insert — analysis need not be done. */
export function canReleaseItem(item: UploadItem): boolean {
  return !!item.path && (item.status === "ready" || item.status === "analyzing");
}

/**
 * What the row says it is doing. There is no phase without a label: 100% bytes
 * sent reads "Finalizing", because the server has not accepted them yet.
 */
export function itemStatusLabel(item: UploadItem): string {
  switch (item.status) {
    case "reading":
      return "Starting upload…";
    case "uploading":
      return item.percent >= 100 ? "Finalizing — waiting for storage…" : `Uploading… ${item.percent}%`;
    case "analyzing":
      return "Uploaded · reading tempo and key…";
    case "ready":
      return "Uploaded · ready to release";
    case "failed":
      return item.error || "Failed";
    case "released":
      return "Released";
  }
}

export function uploadFailureMessage(reason: UploadFailureReason | null): string {
  if (reason === "stalled") return "Upload stalled — no data moved. Retry when your connection is back.";
  if (reason === "rejected") return "Storage rejected the file. Check you are signed in, then retry.";
  if (reason === "network") return "Network dropped during upload. Retry.";
  return "Upload failed — check your connection and retry.";
}

export interface QueueSummary {
  total: number;
  /** Items whose bytes are still moving or waiting to move. */
  inFlight: number;
  releasable: number;
  released: number;
  failed: number;
  /** Bytes-sent progress across the batch, 0..100. */
  percent: number;
}

export function summarizeQueue(items: UploadItem[]): QueueSummary {
  const total = items.length;
  if (!total) {
    return { total: 0, inFlight: 0, releasable: 0, released: 0, failed: 0, percent: 0 };
  }
  let inFlight = 0;
  let releasable = 0;
  let released = 0;
  let failed = 0;
  let percentSum = 0;
  for (const item of items) {
    if (item.status === "reading" || item.status === "uploading") inFlight++;
    if (canReleaseItem(item)) releasable++;
    if (item.status === "released") released++;
    if (item.status === "failed") failed++;
    percentSum += item.path || item.status === "released" ? 100 : item.percent;
  }
  return {
    total,
    inFlight,
    releasable,
    released,
    failed,
    percent: Math.round(percentSum / total),
  };
}

/** One Library row. `assets.kind` stays `track` (database check); format carries the media type. */
export function buildDropInput(
  item: UploadItem,
  opts: {
    audience: PostAudience;
    releaseType: ReleaseType;
    fingerprint?: string;
    license?: string;
  },
): NewDrop {
  const bpm = Number(item.meta.bpm);
  return {
    title: item.meta.title.trim() || undefined,
    body: item.body?.trim() || undefined,
    seed: item.seed,
    assetKind: "track",
    audioUrl: item.path ?? undefined,
    waveform: item.meta.peaks,
    durationSec: item.meta.durationSec || undefined,
    bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : undefined,
    musicalKey: item.meta.musicalKey || undefined,
    audioFormat: item.meta.format || undefined,
    sampleRate: item.meta.sampleRate || undefined,
    lossless: item.meta.lossless,
    license: opts.license ?? "collab-only",
    sha256: item.sha256,
    fingerprint: opts.fingerprint,
    fx: "glow",
    audience: opts.audience,
    creditedArtist: item.meta.creditedArtist.trim() || undefined,
    album: item.meta.album.trim() || undefined,
    releaseType: opts.releaseType,
  };
}

/* ------------------------------------------------------------------------- */
/* Store                                                                      */
/* ------------------------------------------------------------------------- */

let items: UploadItem[] = [];
const listeners = new Set<() => void>();
/** In-flight upload ids. Not part of the snapshot: the UI reads status instead. */
const running = new Set<string>();
/** Ids whose decode has not settled yet. */
const analyzing = new Set<string>();

function emit() {
  listeners.forEach((l) => l());
}

function setItems(next: UploadItem[]) {
  if (next === items) return;
  items = next;
  emit();
}

function patch(
  id: string,
  update: Partial<UploadItem> | ((item: UploadItem) => UploadItem),
) {
  setItems(patchItems(items, id, update));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUploadQueue(): UploadItem[] {
  return items;
}

export function useUploadQueue(): UploadItem[] {
  return useSyncExternalStore(subscribe, getUploadQueue, getUploadQueue);
}

function newId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extOf(name: string): string {
  return (name.split(".").pop() || "audio").toLowerCase();
}

/**
 * Measure the file while it uploads. The decode is CPU-bound and the upload is
 * network-bound, so they overlap; the decode must never delay the first byte.
 */
async function analyze(id: string, file: File) {
  analyzing.add(id);
  try {
    const wf = await computeWaveform(file, WAVEFORM_BUCKETS, true).catch(() => null);
    patch(id, (item) => applyAnalysis(item, wf));
  } finally {
    analyzing.delete(id);
    patch(id, (item) => (item.status === "analyzing" ? { ...item, status: "ready" } : item));
  }
}

async function runUpload(id: string) {
  running.add(id);
  try {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const file = item.file;

    const blob: Blob = file;
    const ext = extOf(file.name);

    patch(id, { status: "uploading", percent: 0, error: null });

    let failure: UploadFailureReason | null = null;
    const path = await api.uploadAudio(
      blob,
      ext,
      (pct) => patch(id, (i) => (i.percent === pct ? i : { ...i, percent: pct })),
      (reason) => {
        failure = reason;
      },
    );

    if (!path) {
      patch(id, { status: "failed", percent: 0, error: uploadFailureMessage(failure) });
      return;
    }

    patch(id, (i) => ({
      ...i,
      path,
      percent: 100,
      error: null,
      status: analyzing.has(id) ? "analyzing" : "ready",
    }));

    // Provenance, after the bytes are safe and never blocking release.
    void hashBlobGuarded(blob).then((sha256) => {
      if (sha256) patch(id, { sha256 });
    });
  } finally {
    running.delete(id);
    pump();
  }
}

function pump() {
  for (const id of nextUploadIds(items, [...running])) {
    void runUpload(id);
  }
}

/**
 * Add files and start sending them. Nothing here waits for the artist: tags are
 * read, the decode is kicked off, and the upload starts in the same tick.
 */
export function enqueueUploads(list: FileList | File[]): {
  ids: string[];
  skippedNonAudio: number;
  skippedEmpty: number;
  skippedOversize: number;
} {
  const { files, skippedNonAudio, skippedEmpty, skippedOversize } = collectUploadFiles(list);
  const added = files.map((file) =>
    createUploadItem(file, newId(), Math.floor(Math.random() * 1e6)),
  );
  if (added.length) {
    setItems([...items, ...added]);
    for (const item of added) {
      if (!isAudioFile(item.file)) continue;
      // Container tags are a header read, not a decode — cheap enough to run now.
      void readId3Tags(item.file)
        .then((tags) => {
          if (tags.artworkUrl) URL.revokeObjectURL(tags.artworkUrl);
          patch(item.id, (i) => applyTags(i, tags));
        })
        .catch(() => undefined);
      void analyze(item.id, item.file);
    }
    pump();
  }
  return { ids: added.map((i) => i.id), skippedNonAudio, skippedEmpty, skippedOversize };
}

export function retryUpload(id: string) {
  const item = items.find((i) => i.id === id);
  if (!item || item.status !== "failed") return;
  patch(id, { status: "reading", percent: 0, error: null });
  pump();
}

export function editUploadMeta(id: string, field: EditableMetaField, value: string) {
  patch(id, (item) => editMeta(item, field, value));
}

export function annotateUploadBody(id: string, body: string) {
  patch(id, { body });
}

export function markUploadReleased(id: string, dropId: string) {
  patch(id, { status: "released", dropId, error: null });
}

export function markUploadFailed(id: string, error: string) {
  patch(id, { status: "failed", error });
}

/** Drop a row from the list. An upload already in flight is left to finish. */
export function removeUploadItem(id: string) {
  const next = items.filter((i) => i.id !== id);
  if (next.length !== items.length) setItems(next);
}

export function clearReleasedUploads() {
  const next = items.filter((i) => i.status !== "released");
  if (next.length !== items.length) setItems(next);
}

/** Only for closing the sheet on an empty queue, and for tests. */
export function resetUploadQueue() {
  running.clear();
  analyzing.clear();
  setItems([]);
}
