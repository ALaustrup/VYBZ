import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Music2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ForgeAtmosphere } from "@/components/ForgeAtmosphere";
import { NexusPageHeader } from "@/components/NexusPageHeader";
import { useSession } from "@/store/session";
import {
  createReleaseWithScan,
  flushPrepareQueue,
  getPrepareOwnerId,
  rescanReleaseWithAudio,
} from "@/features/prepare/service";
import { probeAudioFile } from "@/features/prepare/probeClient";
import { stashPendingAudio, peekPendingAudio } from "@/features/prepare/pendingUpload";
import { setWorkingTrack } from "@/features/workspace/workingSet";
import { ensureMetadataCredits } from "@/features/credits/service";
import {
  BATCH_LOUDNESS_SPREAD_LU,
  MAX_ANALYZER_BATCH,
  analyzerWorkerCount,
  runWithConcurrency,
} from "@/features/prepare/scanConcurrency";
import {
  batchLoudnessSpreadLu,
  isAnalyzerAudioReady,
  loudnessFromProbe,
  topAnalyzerIssue,
} from "@/features/prepare/analyzerReady";
import { shipAutoFixForCode, type AutoFixOp } from "@/features/prepare/autoFixMap";
import { applyAutoFixToBlob } from "@/features/prepare/applyAutoFix";
import { nextDeskStepsFromFindings } from "@/features/prepare/nextDeskFromFindings";
import { WhatNextDesks } from "@/features/prepare/WhatNextDesks";
import { publishPendingToLibrary } from "@/features/prepare/publishPendingToLibrary";
import { parseArtistTitleFromFilename, type AudioProbe, type ReleaseFinding } from "@vybz/domain/releases";
import { cx } from "@/lib/utils";
import { getSnapshot, playTrack, stop } from "@/lib/audioBus";
import { stopAudioPreview } from "@/lib/audioPreview";
import { decodeToBuffer } from "@/lib/audioEdit";
import { localSignal } from "@/lib/vdock/playbackSignal";
import {
  buildMatchedCompareObjectUrls,
  compareSideASignal,
  compareSideBSignal,
  planarFromAudioBuffer,
  revokeCompareObjectUrls,
  VDOCK_COMPARE_PREVIEW_VERSION,
} from "@/lib/vdock/comparePreview";

const ANALYZER_PREVIEW_PREFIX = "analyzer-preview:";

type MatchedListen = {
  aUrl: string;
  bUrl: string;
  matchLabel: string;
  token: string;
};
type RowPhase = "queued" | "scanning" | "done" | "error";

type DeskRow = {
  localId: string;
  fileName: string;
  originalBlob: Blob;
  currentBlob: Blob;
  mimeType: string;
  phase: RowPhase;
  error?: string;
  releaseId?: string;
  title?: string;
  artistName?: string | null;
  findings?: ReleaseFinding[];
  probe?: AudioProbe;
  lastFixLabel?: string;
  libraryDropId?: string;
};

function isAudioFile(f: File): boolean {
  return f.type.startsWith("audio/") || /\.(wav|flac|aiff?|mp3|m4a|ogg|opus)$/i.test(f.name);
}

function formatLu(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)} LUFS`;
}

function formatPeak(probe?: AudioProbe): string {
  if (!probe) return "—";
  if (typeof probe.truePeakDbtp === "number") return `${probe.truePeakDbtp.toFixed(1)} dBTP`;
  if (typeof probe.peakDbfs === "number") return `${probe.peakDbfs.toFixed(1)} dBFS`;
  return "—";
}

function formatDur(sec?: number): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ReleasesPage() {
  const { userId, showToast } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DeskRow[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"fixed" | "original">("fixed");
  const [latchedBefore, setLatchedBefore] = useState(false);
  const [matchedByRow, setMatchedByRow] = useState<Record<string, MatchedListen>>({});
  const objectUrls = useRef<Map<string, string>>(new Map());
  const matchBuildKeys = useRef<Set<string>>(new Set());
  const finePointer = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  const workers = analyzerWorkerCount();

  const matchFingerprint = rows
    .filter((r) => r.lastFixLabel && r.phase === "done")
    .map((r) => `${r.localId}:${r.lastFixLabel}:${r.originalBlob.size}:${r.currentBlob.size}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await flushPrepareQueue(ownerId);
      } catch (err) {
        if (!cancelled) setBootError(err instanceof Error ? err.message : "Failed to sync Analyzer");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
      stopAudioPreview(ANALYZER_PREVIEW_PREFIX);
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current.clear();
    };
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    const targets = rows.filter((r) => r.lastFixLabel && r.phase === "done");
    const liveIds = new Set(targets.map((r) => r.localId));

    setMatchedByRow((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!liveIds.has(id)) {
          revokeCompareObjectUrls(next[id]!);
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    for (const row of targets) {
      const token = `${row.lastFixLabel}:${row.originalBlob.size}:${row.currentBlob.size}`;
      const buildKey = `${row.localId}:${token}`;
      if (matchBuildKeys.current.has(buildKey)) continue;
      matchBuildKeys.current.add(buildKey);
      void (async () => {
        try {
          const aFile = new File([row.originalBlob], row.fileName, {
            type: row.mimeType || "audio/wav",
          });
          const bFile = new File([row.currentBlob], row.fileName, {
            type: row.mimeType || "audio/wav",
          });
          const aBuf = await decodeToBuffer(aFile);
          const bBuf = await decodeToBuffer(bFile);
          if (cancelled) return;
          const urls = buildMatchedCompareObjectUrls(
            planarFromAudioBuffer(aBuf),
            planarFromAudioBuffer(bBuf),
            aBuf.sampleRate,
          );
          setMatchedByRow((prev) => {
            if (prev[row.localId]?.token === token) {
              revokeCompareObjectUrls(urls);
              return prev;
            }
            const prior = prev[row.localId];
            if (prior) revokeCompareObjectUrls(prior);
            return {
              ...prev,
              [row.localId]: {
                aUrl: urls.aUrl,
                bUrl: urls.bUrl,
                matchLabel: urls.matchLabel,
                token,
              },
            };
          });
        } catch {
          /* leave unmatched listen — disclosure still tags simulation */
        } finally {
          matchBuildKeys.current.delete(buildKey);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [matchFingerprint, rows]);

  useEffect(() => {
    return () => {
      Object.values(matchedByRow).forEach((m) => revokeCompareObjectUrls(m));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount revoke only
  }, []);

  const urlFor = useCallback((key: string, blob: Blob) => {
    const prev = objectUrls.current.get(key);
    if (prev) {
      const active = getSnapshot().track;
      if (active?.url === prev) stop();
      URL.revokeObjectURL(prev);
    }
    const u = URL.createObjectURL(blob);
    objectUrls.current.set(key, u);
    return u;
  }, []);

  const scanning = rows.some((r) => r.phase === "queued" || r.phase === "scanning");
  const doneRows = rows.filter((r) => r.phase === "done");
  const readyRows = doneRows.filter((r) => isAnalyzerAudioReady(r.findings ?? []));
  const needsRows = doneRows.filter((r) => !isAnalyzerAudioReady(r.findings ?? []));

  const batchOp = useMemo(() => {
    const counts = new Map<AutoFixOp, { label: string; disclosure?: string; ids: string[] }>();
    for (const row of needsRows) {
      const issue = topAnalyzerIssue(row.findings ?? []);
      if (!issue) continue;
      const fix = shipAutoFixForCode(issue.code);
      if (!fix || !row.releaseId) continue;
      const cur = counts.get(fix.op) ?? { label: fix.label, disclosure: fix.disclosure, ids: [] };
      cur.ids.push(row.localId);
      counts.set(fix.op, cur);
    }
    let best: { op: AutoFixOp; label: string; disclosure?: string; ids: string[] } | null = null;
    for (const [op, v] of counts) {
      if (!best || v.ids.length > best.ids.length) best = { op, ...v };
    }
    return best;
  }, [needsRows]);

  const loudnessHint = useMemo(() => {
    const vals = doneRows
      .map((r) => loudnessFromProbe(r.probe as unknown as Record<string, unknown>))
      .filter((v): v is number => v != null);
    const spread = batchLoudnessSpreadLu(vals);
    if (spread == null || spread <= BATCH_LOUDNESS_SPREAD_LU) return null;
    return `Levels differ by ${spread.toFixed(1)} LU across these tracks — check consistency before an EP/album.`;
  }, [doneRows]);

  const scanOne = useCallback(
    async (row: DeskRow, blob: Blob) => {
      setRows((prev) => prev.map((r) => (r.localId === row.localId ? { ...r, phase: "scanning", error: undefined } : r)));
      try {
        const probe = await probeAudioFile({
          name: row.fileName,
          type: row.mimeType,
          size: blob.size,
          arrayBuffer: () => blob.arrayBuffer(),
        });
        const parsed = parseArtistTitleFromFilename(row.fileName);
        const title = probe.titleFromName || parsed.titleFromName || row.fileName.replace(/\.[^.]+$/, "");
        const artistName = probe.artistFromName || parsed.artistFromName || null;

        let bundle;
        if (row.releaseId) {
          bundle = await rescanReleaseWithAudio({
            ownerId,
            releaseId: row.releaseId,
            title,
            artistName,
            audio: {
              fileName: row.fileName.replace(/\.[^.]+$/, "") + ".wav",
              mimeType: blob.type || "audio/wav",
              sizeBytes: blob.size,
              probe: probe as AudioProbe,
            },
          });
        } else {
          bundle = await createReleaseWithScan({
            ownerId,
            title,
            artistName,
            audio: {
              fileName: row.fileName,
              mimeType: row.mimeType,
              sizeBytes: blob.size,
              probe: probe as AudioProbe,
            },
            idempotencyKey: crypto.randomUUID(),
          });
        }

        try {
          await ensureMetadataCredits({
            ownerId,
            releaseId: bundle.project.id,
            artistName,
            composerName: probe.composerFromName ?? null,
          });
        } catch {
          /* best-effort */
        }

        stashPendingAudio({
          releaseId: bundle.project.id,
          blob,
          fileName: row.fileName,
          mimeType: blob.type || row.mimeType,
          sizeBytes: blob.size,
          durationSec: probe.durationSeconds,
          sampleRate: probe.sampleRate,
          audioFormat: probe.container,
          lossless: probe.container === "wav" || probe.container === "flac" || blob.type === "audio/wav",
          title: bundle.project.title,
          artistName: bundle.project.artistName,
        });
        setWorkingTrack({
          title: bundle.project.title,
          artistName: bundle.project.artistName,
          fileName: row.fileName,
          mimeType: blob.type || row.mimeType,
          blob,
          source: "analyzer",
          releaseId: bundle.project.id,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.localId === row.localId
              ? {
                  ...r,
                  phase: "done",
                  currentBlob: blob,
                  releaseId: bundle.project.id,
                  title: bundle.project.title,
                  artistName: bundle.project.artistName,
                  findings: bundle.findings,
                  probe: probe as AudioProbe,
                }
              : r,
          ),
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.localId === row.localId
              ? { ...r, phase: "error", error: err instanceof Error ? err.message : "Scan failed" }
              : r,
          ),
        );
      }
    },
    [ownerId],
  );

  const enqueueFiles = useCallback(
    async (files: File[]) => {
      const audio = files.filter(isAudioFile);
      if (audio.length === 0) {
        showToast("Drop audio files (WAV, FLAC, AIFF, MP3…)");
        return;
      }
      const room = MAX_ANALYZER_BATCH - rows.length;
      if (room <= 0) {
        showToast(`Analyzer holds up to ${MAX_ANALYZER_BATCH} tracks at a time`);
        return;
      }
      const take = audio.slice(0, room);
      if (audio.length > room) showToast(`Only ${room} more slot(s) — max ${MAX_ANALYZER_BATCH}`);

      const next: DeskRow[] = take.map((f) => ({
        localId: crypto.randomUUID(),
        fileName: f.name,
        originalBlob: f,
        currentBlob: f,
        mimeType: f.type || "application/octet-stream",
        phase: "queued" as const,
      }));
      setRows((prev) => [...prev, ...next]);

      await runWithConcurrency(next, workers, async (row) => {
        await scanOne(row, row.currentBlob);
      });
    },
    [rows.length, scanOne, showToast, workers],
  );

  function onPick() {
    fileInputRef.current?.click();
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    void enqueueFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    void enqueueFiles(Array.from(e.dataTransfer.files));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function runFix(op: AutoFixOp, localIds: string[], label: string) {
    setFixing(true);
    try {
      const targets = rows.filter((r) => localIds.includes(r.localId) && r.phase === "done");
      for (const row of targets) {
        const fixed = await applyAutoFixToBlob(row.currentBlob, op);
        setRows((prev) =>
          prev.map((r) =>
            r.localId === row.localId
              ? { ...r, currentBlob: fixed, lastFixLabel: label, phase: "queued" }
              : r,
          ),
        );
        await scanOne({ ...row, currentBlob: fixed, lastFixLabel: label }, fixed);
      }
      showToast(`Applied: ${label}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Auto-fix failed");
    } finally {
      setFixing(false);
    }
  }

  async function addReadyToLibrary() {
    if (!userId) {
      showToast("Sign in to add tracks to Library");
      navigate("/enter");
      return;
    }
    setPublishing(true);
    let ok = 0;
    let fail = 0;
    for (const row of readyRows) {
      if (!row.releaseId || row.libraryDropId) continue;
      const pending = peekPendingAudio(row.releaseId);
      if (!pending) {
        fail++;
        continue;
      }
      const res = await publishPendingToLibrary(pending);
      if (res.ok) {
        ok++;
        setRows((prev) =>
          prev.map((r) => (r.localId === row.localId ? { ...r, libraryDropId: res.dropId } : r)),
        );
      } else fail++;
    }
    setPublishing(false);
    if (ok) showToast(`Added ${ok} track(s) to Library`);
    if (fail) showToast(`${fail} could not be added — re-drop if the session lost the file`);
  }

  function playRow(row: DeskRow, mode: "fixed" | "original") {
    const match = matchedByRow[row.localId];
    const useMatched = Boolean(row.lastFixLabel && match);
    const trackId = `${ANALYZER_PREVIEW_PREFIX}${row.localId}:${mode}:${useMatched ? "matched" : "unmatched"}`;
    const snap = getSnapshot();
    if (
      previewId === row.localId &&
      previewMode === mode &&
      snap.track?.id === trackId &&
      snap.playing
    ) {
      stopAudioPreview(ANALYZER_PREVIEW_PREFIX);
      setPreviewId(null);
      return;
    }

    stopAudioPreview(ANALYZER_PREVIEW_PREFIX);
    let url: string;
    if (useMatched && match) {
      url = mode === "original" ? match.aUrl : match.bUrl;
    } else {
      const blob = mode === "original" ? row.originalBlob : row.currentBlob;
      url = urlFor(`${row.localId}:${mode}`, blob);
    }
    const processLabel = `Analyzer auto-fix preview (${row.lastFixLabel ?? "fix"})`;
    const signal = row.lastFixLabel
      ? mode === "original"
        ? compareSideASignal(useMatched)
        : compareSideBSignal(processLabel, useMatched)
      : localSignal();
    const track = {
      id: trackId,
      url,
      title: `${row.title || row.fileName} · ${mode === "original" ? "Before" : "After"}${useMatched ? " · loudness-matched" : ""}`,
      artist: "Analyzer",
      signal,
    };
    playTrack(track, [track]);
    setPreviewId(row.localId);
    setPreviewMode(mode);
  }

  function stopPreview() {
    stopAudioPreview(ANALYZER_PREVIEW_PREFIX);
    setPreviewId(null);
  }

  if (booting) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  }

  if (bootError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-rose-300">{bootError}</div>
    );
  }

  const batchDone = rows.length > 0 && !scanning;

  return (
    <div
      className="analyzer-desk relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 md:pb-16"
      data-testid="prepare-releases"
      data-analyzer-desk=""
    >
      <div className="pointer-events-none absolute inset-x-0 -top-4 h-[22rem] overflow-hidden rounded-[1.5rem]">
        <ForgeAtmosphere intensity="subtle" wave />
      </div>

      <div className="relative z-[1]">
        <NexusPageHeader
          eyebrow="Analyzer"
          title="Intake desk"
          titleTestId="analyzer-desk-title"
          subtitle={`Drop up to ${MAX_ANALYZER_BATCH} tracks — we measure on this device and tell you if they clear this audio check. Cover art is separate (Art Check). Before/After previews play through VDock with disclosed signals; auto-fix A/B uses loudness-matched listen (${VDOCK_COMPARE_PREVIEW_VERSION}) when buffers are ready.`}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.flac,.aiff,.aif,.mp3,.m4a,.ogg"
        multiple
        className="sr-only"
        data-testid="analyzer-file-input"
        aria-label="Choose audio files to scan"
        onChange={onFileInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        data-testid="analyzer-dropzone"
        data-no-library-drop
        onClick={() => onPick()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick();
          }
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="forge-glass forge-plasma relative z-[1] flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-14 text-center transition hover:border-white/25"
      >
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <Upload className="relative z-[1] h-8 w-8 text-[rgb(var(--app-accent-rgb))]" />
        <div className="relative z-[1]">
          <p className="font-display text-lg font-semibold text-white">Drop tracks to scan</p>
          <p className="mt-1 text-sm text-white/50">
            Analyzer owns this drop · or click to choose · up to {MAX_ANALYZER_BATCH} · {workers} at a
            time on this machine
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2" data-testid="analyzer-triage">
          {rows.map((row) => {
            const ready = row.phase === "done" && isAnalyzerAudioReady(row.findings ?? []);
            const issue = row.phase === "done" ? topAnalyzerIssue(row.findings ?? []) : null;
            const shipFix = issue ? shipAutoFixForCode(issue.code) : null;
            const hasFix = Boolean(row.lastFixLabel);

            return (
              <li key={row.localId}>
                <div
                  className={cx(
                    "forge-card flex flex-col gap-2 transition",
                    previewId === row.localId && "ring-1 ring-cyan-400/40",
                  )}
                  data-testid="analyzer-triage-row"
                  data-phase={row.phase}
                  data-row-id={row.localId}
                  data-release-id={row.releaseId ?? ""}
                  onMouseEnter={() => {
                    if (!finePointer || row.phase !== "done") return;
                    playRow(row, latchedBefore ? "original" : "fixed");
                  }}
                  onMouseLeave={() => {
                    if (!finePointer) return;
                    stopPreview();
                    setLatchedBefore(false);
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => row.releaseId && navigate(`/release/${row.releaseId}`)}
                      disabled={!row.releaseId}
                    >
                      <p className="flex items-center gap-2 truncate font-medium text-snow">
                        <Music2 className="h-4 w-4 shrink-0 text-white/40" />
                        {row.title || row.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-fog">
                        {row.phase === "scanning" || row.phase === "queued"
                          ? row.phase === "queued"
                            ? "Queued…"
                            : "Scanning…"
                          : row.phase === "error"
                            ? row.error
                            : issue && !ready
                              ? issue.title || issue.code
                              : row.artistName || "Ready for this audio check"}
                      </p>
                    </button>
                    {row.phase === "scanning" || row.phase === "queued" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white/45" />
                    ) : row.phase === "error" ? (
                      <Badge tone="danger">Error</Badge>
                    ) : ready ? (
                      <Badge tone="success">Ready</Badge>
                    ) : (
                      <Badge tone="warning">Needs work</Badge>
                    )}
                  </div>

                  {row.phase === "done" && row.probe && (
                    <div className="flex flex-wrap gap-3 text-[11px] text-white/45">
                      <span>{formatLu(row.probe.integratedLufs ?? row.probe.integratedLufsApprox)}</span>
                      <span>{formatPeak(row.probe)}</span>
                      <span>{formatDur(row.probe.durationSeconds)}</span>
                      {row.lastFixLabel ? (
                        <span className="text-cyan-300/80">
                          Fixed · {row.lastFixLabel}
                          {matchedByRow[row.localId]
                            ? ` · matched ${matchedByRow[row.localId]!.matchLabel}`
                            : ""}
                        </span>
                      ) : null}
                      {row.libraryDropId ? (
                        <Link to={`/track/${row.libraryDropId}`} className="text-cyan-300/90 underline-offset-2 hover:underline">
                          In Library
                        </Link>
                      ) : null}
                    </div>
                  )}

                  {row.phase === "done" && (
                    <div className="flex flex-wrap gap-2">
                      {shipFix && !ready && (
                        <Button
                          variant="forge"
                          className="!px-3 !py-1.5 text-xs"
                          disabled={fixing}
                          onClick={() => void runFix(shipFix.op, [row.localId], shipFix.label)}
                        >
                          Fix · {shipFix.label}
                        </Button>
                      )}
                      {!shipFix && !ready && issue && (
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => row.releaseId && navigate(`/release/${row.releaseId}`)}
                        >
                          See findings
                        </Button>
                      )}
                      {hasFix && (
                        <>
                          <button
                            type="button"
                            className={cx(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              previewMode === "original" && previewId === row.localId
                                ? "bg-white/15 text-white"
                                : "bg-white/[0.06] text-white/60",
                            )}
                            onMouseEnter={() => {
                              if (finePointer) {
                                setLatchedBefore(true);
                                playRow(row, "original");
                              }
                            }}
                            onMouseLeave={() => {
                              if (finePointer) {
                                setLatchedBefore(false);
                                playRow(row, "fixed");
                              }
                            }}
                            onClick={() => {
                              setLatchedBefore((v) => !v);
                              playRow(row, previewMode === "original" ? "fixed" : "original");
                            }}
                          >
                            Before
                          </button>
                          {!finePointer && (
                            <button
                              type="button"
                              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60"
                              onClick={() => playRow(row, "fixed")}
                            >
                              After
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {loudnessHint && batchDone ? (
        <p className="text-center text-xs text-amber-200/80">{loudnessHint}</p>
      ) : null}

      {batchDone && (
        <footer className="forge-glass forge-plasma relative z-[1] space-y-3 p-4" data-testid="analyzer-footer">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] space-y-2">
            {needsRows.length === 0 ? (
              <>
                <p className="font-display text-lg font-semibold text-white">All tracks cleared this check.</p>
                <p className="text-sm text-white/50">
                  Ready means no blocking audio issues here — not store approval. Re-check after any new bounce.
                </p>
              </>
            ) : readyRows.length === 0 ? (
              <>
                <p className="font-display text-lg font-semibold text-white">None ready yet.</p>
                <p className="text-sm text-white/50">
                  Click a track for its full report, or use Fix when we can correct it on-device.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-semibold text-white">
                  {readyRows.length} of {doneRows.length} tracks are ready.
                </p>
                <p className="text-sm text-white/50">
                  Click a track that needs work to see the next Analyzer steps.
                </p>
              </>
            )}

            {(readyRows[0]?.releaseId || needsRows[0]?.releaseId) && (
              <div
                className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3"
                data-testid="analyzer-next-steps"
              >
                {(() => {
                  const focus = needsRows[0] ?? readyRows[0];
                  const id = focus?.releaseId;
                  if (!id) return null;
                  const measured = nextDeskStepsFromFindings(
                    needsRows.flatMap((r) => r.findings ?? []),
                    { releaseId: id, limit: 5 },
                  );
                  return (
                    <>
                      <WhatNextDesks
                        steps={measured}
                        title="What next (from findings)"
                        className="w-full"
                      />
                      <p className="w-full text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Next on the release
                      </p>
                      <Link
                        to={`/release/${id}/credits`}
                        className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[12px] text-white/75 transition hover:border-white/25 hover:text-white"
                      >
                        Credits
                      </Link>
                      <Link
                        to={`/release/${id}/master`}
                        className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[12px] text-white/75 transition hover:border-white/25 hover:text-white"
                      >
                        Master
                      </Link>
                      <Link
                        to={`/release/${id}/distribution`}
                        className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[12px] text-white/75 transition hover:border-white/25 hover:text-white"
                      >
                        Package
                      </Link>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {batchOp && (
                <Button
                  variant="forge"
                  disabled={fixing}
                  onClick={() => void runFix(batchOp.op, batchOp.ids, batchOp.label)}
                >
                  {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Fix ${batchOp.label} on ${batchOp.ids.length}`}
                </Button>
              )}
              {batchOp?.disclosure ? (
                <p className="w-full text-[11px] text-white/40">{batchOp.disclosure}</p>
              ) : null}
              {needsRows[0]?.releaseId && (
                <Button variant="ghost" onClick={() => navigate(`/release/${needsRows[0]!.releaseId}`)}>
                  Fix issues
                </Button>
              )}
              {readyRows.length > 0 && (
                <Button variant="forge" disabled={publishing} onClick={() => void addReadyToLibrary()}>
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add ready to Library"}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}

      {scanning && (
        <p className="text-center text-xs text-white/40" data-testid="analyzer-scanning">
          Scanning {rows.filter((r) => r.phase === "done" || r.phase === "error").length} of {rows.length} ·{" "}
          {workers} at a time
        </p>
      )}
    </div>
  );
}
