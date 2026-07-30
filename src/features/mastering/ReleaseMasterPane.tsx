import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { StateView } from "@/components/states/StateView";
import {
  getAiJob,
  listAiJobs,
  runLocalMasterJob,
  subscribeAiJobs,
  type AiMasterJob,
} from "@/features/mastering/aiMasterService";
import {
  AI_LOW_BALANCE_SECONDS,
  getAiCreditBalance,
} from "@/platform/costs/aiCredits";

function useAiJobs(projectId?: string): AiMasterJob[] {
  const [jobs, setJobs] = useState(() => listAiJobs(projectId));
  useEffect(() => {
    const refresh = () => setJobs(listAiJobs(projectId));
    refresh();
    return subscribeAiJobs(refresh);
  }, [projectId]);
  return jobs;
}

export type ReleaseMasterPaneProps = {
  /** When set (e2e), skip release lookup and seed a tiny WAV. */
  e2eMode?: boolean;
  projectId?: string;
};

/** `/release/:id/master` — Analyze & Master, progress, A/B, download. */
export function ReleaseMasterPane({ e2eMode = false, projectId: projectIdProp }: ReleaseMasterPaneProps) {
  const { id: routeId } = useParams();
  const projectId = projectIdProp ?? routeId ?? (e2eMode ? "e2e-release" : undefined);
  const jobs = useAiJobs(projectId);
  const latest = jobs[0] ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ab, setAb] = useState<"A" | "B">("B");
  const [file, setFile] = useState<File | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const latestStatus = jobs[0]?.status;

  useEffect(() => {
    let cancelled = false;
    void getAiCreditBalance().then((b) => {
      if (!cancelled) setCreditBalance(b);
    });
    return () => {
      cancelled = true;
    };
  }, [latestStatus]);

  useEffect(() => {
    if (!e2eMode) return;
    // Tiny deterministic WAV (~0.25 s @ 8 kHz) under 2 MB for Playwright.
    const sampleRate = 8000;
    const n = 2000;
    const dataSize = n * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < n; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.2;
      view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
    }
    setFile(new File([buffer], "e2e-clip.wav", { type: "audio/wav" }));
  }, [e2eMode]);

  const onAnalyze = async () => {
    if (!file || !projectId) return;
    setBusy(true);
    setError(null);
    setAb("B");
    try {
      await runLocalMasterJob({
        projectId,
        file,
        fileName: file.name,
        fixtureMeta: e2eMode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mastering failed");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = () => {
    if (!latest?.masteredBlob) return;
    const url = URL.createObjectURL(latest.masteredBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mastered.wav";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const statusLabel =
    latest?.status === "completed"
      ? "Completed"
      : latest?.status === "processing"
        ? "Processing"
        : latest?.status === "failed"
          ? "Failed"
          : latest?.status === "queued"
            ? "Queued"
            : "Idle";

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8"
      data-testid="release-master-pane"
    >
      {!e2eMode && (
        <div>
          <Link to={projectId ? `/release/${projectId}` : "/releases"} className="text-xs text-fog hover:text-snow">
            ← Release
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-snow">MasterReady</h1>
          <p className="mt-1 text-sm text-fog">
            Analyze &amp; Master — loudness normalize, peak limit, metadata suggestions.
          </p>
        </div>
      )}

      {e2eMode && (
        <header className="flex items-center justify-between border-b border-white/10 pb-3">
          <h1 className="font-display text-xl font-semibold text-snow">MasterReady · e2e</h1>
          <Badge tone="info">fixture</Badge>
        </header>
      )}

      {creditBalance !== null && creditBalance < AI_LOW_BALANCE_SECONDS && (
        <div
          className="rounded-suite-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-snow"
          data-testid="master-low-balance-banner"
        >
          AI minute balance low ({Math.floor(creditBalance)}s).{" "}
          <Link to="/settings/credits" className="underline hover:text-suite-cyan">
            Top up credits
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!e2eMode && (
          <label className="inline-flex h-9 cursor-pointer items-center rounded-suite-md border border-white/10 bg-graphite px-3 text-xs font-semibold text-snow hover:border-suite-cyan/40">
            Choose WAV
            <input
              type="file"
              accept="audio/wav,.wav"
              className="hidden"
              data-testid="master-file-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        <button
          type="button"
          data-testid="analyze-master-btn"
          disabled={!file || busy}
          onClick={() => void onAnalyze()}
          className="inline-flex h-9 items-center rounded-suite-md bg-suite-cyan px-4 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Analyze &amp; Master
        </button>
        {file && (
          <span className="text-xs text-fog" data-testid="master-file-name">
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {(busy || latest) && (
        <div className="space-y-2" data-testid="master-progress-block">
          <div className="flex items-center justify-between text-xs text-fog">
            <span data-testid="master-job-status">{statusLabel}</span>
            <span>{Math.round(latest?.progress ?? (busy ? 10 : 0))}%</span>
          </div>
          <Progress
            value={latest?.progress ?? (busy ? 10 : 0)}
            label="Mastering progress"
            data-testid="master-progress"
          />
        </div>
      )}

      {error && (
        <StateView variant="error" title="Mastering failed" body={error} />
      )}

      {latest?.status === "completed" && (
        <div className="space-y-4" data-testid="master-result">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" data-testid="master-status-completed">
              Completed
            </Badge>
            <span className="text-xs text-fog">{latest.metrics?.procVersion}</span>
            <div className="ml-auto flex gap-1" role="group" aria-label="A/B preview">
              <button
                type="button"
                data-testid="master-ab-a"
                className={`h-8 rounded-suite-md px-3 text-xs font-semibold ${ab === "A" ? "bg-white/15 text-snow" : "text-fog"}`}
                onClick={() => setAb("A")}
              >
                A · Original
              </button>
              <button
                type="button"
                data-testid="master-ab-b"
                className={`h-8 rounded-suite-md px-3 text-xs font-semibold ${ab === "B" ? "bg-white/15 text-snow" : "text-fog"}`}
                onClick={() => setAb("B")}
              >
                B · Mastered
              </button>
            </div>
          </div>

          <audio
            key={ab}
            controls
            className="w-full"
            data-testid="master-ab-player"
            src={ab === "A" ? latest.originalUrl : latest.masteredUrl}
          />

          <div
            className="flex h-16 items-end gap-px overflow-hidden rounded-suite-md bg-white/5 px-1"
            data-testid="master-wave-ab"
            aria-hidden
          >
            {Array.from({ length: 64 }, (_, i) => {
              const seed = (ab === "A" ? 1 : 1.4) * Math.abs(Math.sin(i * 0.35 + (ab === "B" ? 1 : 0)));
              return (
                <div
                  key={i}
                  className="flex-1 bg-suite-cyan/70"
                  style={{ height: `${12 + seed * 70}%` }}
                />
              );
            })}
          </div>

          <button
            type="button"
            data-testid="download-mastered-wav"
            onClick={onDownload}
            className="inline-flex h-9 items-center rounded-suite-md border border-white/15 bg-graphite px-4 text-xs font-semibold text-snow hover:border-suite-cyan/40"
          >
            Download mastered WAV
          </button>

          {latest.metadata && (
            <dl
              className="grid grid-cols-2 gap-2 rounded-suite-md border border-white/10 bg-graphite/60 p-3 text-xs"
              data-testid="master-metadata"
            >
              <div>
                <dt className="text-fog">Genre</dt>
                <dd className="text-snow">{latest.metadata.genre}</dd>
              </div>
              <div>
                <dt className="text-fog">Mood</dt>
                <dd className="text-snow">{latest.metadata.mood}</dd>
              </div>
              <div>
                <dt className="text-fog">BPM</dt>
                <dd className="text-snow">{latest.metadata.bpm}</dd>
              </div>
              <div>
                <dt className="text-fog">ISRC suggestion</dt>
                <dd className="text-snow">{latest.metadata.isrcSuggestion}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {/* Keep getAiJob referenced for testability */}
      {latest && <span className="sr-only">{getAiJob(latest.jobId)?.jobId}</span>}
    </div>
  );
}
