/**
 * Bring a Library track's master into the shared working set.
 *
 * The working set has always been able to carry one track between desks; until
 * now nothing seeded it from the Library, so every tool asked you to drag in a
 * file you had already uploaded.
 *
 * CORRECTNESS — the bytes must be the original master obtained through the play
 * ticket. `downloadAsset` is deliberately not used and must never be imported
 * here: that path can apply a forensic watermark, and a correction or analysis
 * desk run on a watermarked copy would be measuring the watermark rather than
 * the master.
 */

import { dropsByIds, resolveAudioUrl } from "@/lib/api";
import { setWorkingTrack } from "@/features/workspace/workingSet";
import type { Drop } from "@/types";

/** No byte has arrived for this long — the connection is gone, not slow. */
const FETCH_STALL_MS = 45_000;
/** How often the watchdog checks; the window it enforces is the constant above. */
const FETCH_WATCHDOG_TICK_MS = 5_000;

export type LibraryTrackLoadFailure =
  | "no-audio"
  | "rejected"
  | "network"
  | "stalled"
  | "cancelled";

export type LibraryTrackLoadPhase =
  | { phase: "resolving" }
  | { phase: "fetching"; receivedBytes: number; totalBytes: number | null; percent: number | null }
  | { phase: "loaded"; bytes: number }
  | { phase: "failed"; reason: LibraryTrackLoadFailure };

export type LoadLibraryTrackOptions = {
  onPhase?: (phase: LibraryTrackLoadPhase) => void;
  /** Caller-owned cancellation — closing the dialog stops the transfer. */
  signal?: AbortSignal;
};

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  wav: "audio/wav",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  flac: "audio/flac",
  alac: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

const EXT_BY_MIME: Readonly<Record<string, string>> = {
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/vnd.wave": "wav",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

function normalizeContentType(contentType: string | null | undefined): string | null {
  const bare = (contentType ?? "").split(";")[0]?.trim().toLowerCase();
  return bare || null;
}

function extensionFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const withoutQuery = url.split(/[?#]/)[0] ?? "";
  const match = /\.([a-z0-9]{1,5})$/i.exec(withoutQuery);
  const ext = match?.[1]?.toLowerCase() ?? null;
  return ext && ext in MIME_BY_EXT ? ext : null;
}

/**
 * The file extension to label these bytes with, measured sources first.
 *
 * The server's `Content-Type` is what actually arrived, so it outranks the
 * format recorded at upload, which in turn outranks the stored object's own
 * name. When none of the three answers, the extension is omitted rather than
 * guessed — the desks decode by container, not by filename.
 */
export function libraryTrackExtension(
  drop: Drop,
  opts: { contentType?: string | null; url?: string | null } = {}
): string | null {
  const contentType = normalizeContentType(opts.contentType);
  if (contentType && EXT_BY_MIME[contentType]) return EXT_BY_MIME[contentType]!;

  const stored = (drop.audioFormat ?? "").trim().toLowerCase();
  if (stored && stored in MIME_BY_EXT) return stored;

  return extensionFromUrl(opts.url);
}

/** A filesystem-safe name for the desks that show one, from the title we hold. */
export function libraryTrackFileName(drop: Drop, ext: string | null): string {
  const base =
    (drop.title ?? "")
      .trim()
      .replace(/[^\w.-]+/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 48) || "track";
  return ext ? `${base}.${ext}` : base;
}

/**
 * The MIME type to carry alongside the blob.
 *
 * Empty when nothing measured says what this is; `workingTrackAsFile` already
 * has a documented fallback for that case, and inventing a type here would be
 * claiming an encoding we did not observe.
 */
export function libraryTrackMimeType(
  contentType: string | null | undefined,
  ext: string | null
): string {
  const bare = normalizeContentType(contentType);
  if (bare && bare !== "application/octet-stream" && bare !== "binary/octet-stream") return bare;
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext]!;
  return "";
}

/** What to tell the person when the transfer did not produce a master. */
export function describeLibraryTrackFailure(reason: LibraryTrackLoadFailure): string {
  switch (reason) {
    case "no-audio":
      return "This track has no playable audio to open in a tool.";
    case "rejected":
      return "The audio server refused the request. Try again in a moment.";
    case "network":
      return "Could not reach the audio. Check your connection and try again.";
    case "stalled":
      return "The transfer went silent and was stopped. Try again.";
    case "cancelled":
      return "Loading cancelled.";
  }
}

/**
 * The track an album-level action will actually act on.
 *
 * An album cannot become a single working track: the working set holds one
 * master, and merging several would fabricate audio nobody recorded. Callers
 * that offer an audio tool on an album must therefore name the track they are
 * opening rather than implying the whole release is being processed.
 */
export function pickAlbumLeadTrack(drops: readonly Drop[]): Drop | null {
  return drops.find((d) => Boolean(d.audioUrl)) ?? drops[0] ?? null;
}

/** Resolve a playable https URL for this drop, re-signing when we hold none. */
async function resolveMasterUrl(drop: Drop): Promise<string | null> {
  if (drop.audioUrl) {
    const direct = await resolveAudioUrl(drop.audioUrl);
    if (direct) return direct;
  }
  // The loader that produced this Drop may predate its asset, or its play
  // ticket may have expired. Re-reading the drop mints a fresh signed URL.
  if (!drop.assetId) return null;
  const [fresh] = await dropsByIds([drop.id]);
  if (!fresh?.audioUrl) return null;
  return resolveAudioUrl(fresh.audioUrl);
}

type FetchOutcome =
  | { ok: true; blob: Blob; contentType: string | null }
  | { ok: false; reason: LibraryTrackLoadFailure };

/**
 * Fetch the master, reporting progress and aborting a transfer that has gone
 * silent.
 *
 * Deliberately not a total-duration cap: a large master legitimately takes a
 * long time and capping it would kill transfers that are working. What is never
 * legitimate is silence, which is the state a dead connection sits in forever.
 */
async function fetchMaster(url: string, opts: LoadLibraryTrackOptions): Promise<FetchOutcome> {
  const controller = new AbortController();
  let lastActivity = Date.now();
  let stalled = false;

  const timer = setInterval(() => {
    if (Date.now() - lastActivity < FETCH_STALL_MS) return;
    stalled = true;
    controller.abort();
  }, FETCH_WATCHDOG_TICK_MS);

  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(url, { signal: controller.signal });
    lastActivity = Date.now();
    if (!res.ok) return { ok: false, reason: "rejected" };

    const contentType = res.headers?.get?.("content-type") ?? null;
    const declared = Number(res.headers?.get?.("content-length") ?? "");
    const totalBytes = Number.isFinite(declared) && declared > 0 ? declared : null;

    const reader = res.body?.getReader?.();
    if (!reader) {
      // No streaming body (older engines, and jsdom in tests) — one shot, no
      // byte-level progress to report honestly.
      const blob = await res.blob();
      opts.onPhase?.({
        phase: "fetching",
        receivedBytes: blob.size,
        totalBytes: totalBytes ?? blob.size,
        percent: 100,
      });
      return { ok: true, blob, contentType };
    }

    const chunks: BlobPart[] = [];
    let receivedBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      lastActivity = Date.now();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      receivedBytes += value.byteLength;
      opts.onPhase?.({
        phase: "fetching",
        receivedBytes,
        totalBytes,
        percent: totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null,
      });
    }
    return { ok: true, blob: new Blob(chunks, { type: contentType ?? "" }), contentType };
  } catch {
    if (stalled) return { ok: false, reason: "stalled" };
    if (opts.signal?.aborted) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: "network" };
  } finally {
    clearInterval(timer);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * Load one Library track's master into the working set.
 *
 * Returns false rather than throwing; the reason reaches the caller through
 * `onPhase` so a surface can say what went wrong instead of sitting empty.
 */
export async function loadLibraryTrackIntoWorkingSet(
  drop: Drop,
  opts: LoadLibraryTrackOptions = {}
): Promise<boolean> {
  const fail = (reason: LibraryTrackLoadFailure) => {
    opts.onPhase?.({ phase: "failed", reason });
    return false;
  };

  opts.onPhase?.({ phase: "resolving" });

  let url: string | null = null;
  try {
    url = await resolveMasterUrl(drop);
  } catch {
    return fail("network");
  }
  if (!url) return fail("no-audio");
  if (opts.signal?.aborted) return fail("cancelled");

  const got = await fetchMaster(url, opts);
  if (!got.ok) return fail(got.reason);
  if (opts.signal?.aborted) return fail("cancelled");

  const ext = libraryTrackExtension(drop, { contentType: got.contentType, url });
  setWorkingTrack({
    title: drop.title?.trim() || libraryTrackFileName(drop, null),
    artistName: drop.creditedArtist?.trim() || drop.authorUsername || null,
    fileName: libraryTrackFileName(drop, ext),
    mimeType: libraryTrackMimeType(got.contentType ?? got.blob.type, ext),
    blob: got.blob,
    source: "library",
    dropId: drop.id,
  });

  opts.onPhase?.({ phase: "loaded", bytes: got.blob.size });
  return true;
}

/**
 * Load an album's lead track into the working set.
 *
 * There is no honest album-wide equivalent for the audio desks — see
 * `pickAlbumLeadTrack`. The chosen track is returned so the caller can say
 * which one it opened instead of implying it processed the release.
 */
export async function loadAlbumIntoWorkingSet(
  drops: readonly Drop[],
  opts: LoadLibraryTrackOptions = {}
): Promise<{ ok: boolean; track: Drop | null }> {
  const lead = pickAlbumLeadTrack(drops);
  if (!lead) {
    opts.onPhase?.({ phase: "failed", reason: "no-audio" });
    return { ok: false, track: null };
  }
  return { ok: await loadLibraryTrackIntoWorkingSet(lead, opts), track: lead };
}
