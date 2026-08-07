import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music2, ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { StateView } from "@/components/states/StateView";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import { PlatformError } from "@/platform/bridge/errors";
import { useSession } from "@/store/session";
import { createReleaseWithScan, getPrepareOwnerId } from "@/features/prepare/service";
import { ensureMetadataCredits } from "@/features/credits/service";
import { probeArtworkFile, probeAudioFile } from "@/features/prepare/probeClient";
import { PrepareScanStage } from "@/features/prepare/PrepareScanStage";
import { stashPendingAudio } from "@/features/prepare/pendingUpload";
import { scanProgress, type ScanProgress } from "@/features/prepare/scanProgress";
import { parseArtistTitleFromFilename, type AudioProbe, type ArtworkProbe } from "@vybz/domain/releases";

type Phase = "upload" | "scanning";

type PendingAudio = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
};

type PendingArt = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
};

function UploadTile({
  label,
  hint,
  fileName,
  progress,
  complete,
  onPick,
  testId,
  icon: Icon,
}: {
  label: string;
  hint: string;
  fileName: string | null;
  progress: number;
  complete: boolean;
  onPick: () => void;
  testId: string;
  icon: typeof Music2;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="forge-glass relative w-full p-4 text-left transition hover:border-white/20 md:p-5"
      data-testid={testId}
    >
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1] flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-suite-cyan">
          {complete ? <CheckCircle2 className="h-5 w-5 text-suite-success" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{label}</p>
          <p className="mt-0.5 text-xs text-white/45">{fileName ?? hint}</p>
          {progress > 0 && progress < 100 ? (
            <Progress value={progress} className="mt-3" label={`${label} import progress`} />
          ) : complete ? (
            <p className="mt-2 text-[11px] uppercase tracking-wide text-suite-success">Ready to scan</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function NewReleasePage() {
  const { userId } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const bridge = usePlatform();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("upload");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [pendingArt, setPendingArt] = useState<PendingArt | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [artProgress, setArtProgress] = useState(0);
  const [scanProgressState, setScanProgressState] = useState<ScanProgress>(() =>
    scanProgress("idle", 0)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPhase, setErrorPhase] = useState<"import" | "create">("import");
  const autoScanTriggered = useRef(false);

  const reportScan = useCallback((next: ScanProgress) => {
    setScanProgressState((prev) => (next.percent < prev.percent ? prev : next));
  }, []);

  const runScan = useCallback(async () => {
    if (busy || !pendingAudio || !pendingArt) return;
    setBusy(true);
    setError(null);
    setPhase("scanning");
    reportScan(scanProgress("reading", 4));

    try {
      const audioProbe = await probeAudioFile(
        {
          name: pendingAudio.fileName,
          type: pendingAudio.mimeType,
          size: pendingAudio.sizeBytes,
          arrayBuffer: () => pendingAudio.blob.arrayBuffer(),
        },
        reportScan
      );

      reportScan(scanProgress("artwork", 84));
      const artProbe = await probeArtworkFile(
        {
          name: pendingArt.fileName,
          type: pendingArt.mimeType,
          size: pendingArt.sizeBytes,
          arrayBuffer: () => pendingArt.blob.arrayBuffer(),
        },
        reportScan
      );

      reportScan(scanProgress("saving", 93));
      const audioMeta = {
        fileName: pendingAudio.fileName,
        mimeType: pendingAudio.mimeType,
        sizeBytes: pendingAudio.sizeBytes,
        probe: audioProbe as AudioProbe,
        blob: pendingAudio.blob,
      };
      const artMeta = {
        fileName: pendingArt.fileName,
        mimeType: pendingArt.mimeType,
        sizeBytes: pendingArt.sizeBytes,
        probe: artProbe as ArtworkProbe,
      };

      const bundle = await createReleaseWithScan({
        ownerId,
        title: title || audioProbe.titleFromName || "Untitled release",
        artistName: artistName || audioProbe.artistFromName || null,
        audio: audioMeta,
        artwork: artMeta,
        idempotencyKey: crypto.randomUUID(),
      });

      try {
        await ensureMetadataCredits({
          ownerId,
          releaseId: bundle.project.id,
          artistName: artistName || audioProbe.artistFromName || null,
          composerName: audioProbe.composerFromName ?? null,
        });
      } catch {
        /* credits seed is best-effort */
      }

      // The scan never uploads. Keep the analysed audio in memory so the results
      // page can offer an explicit publish without asking for the file again.
      stashPendingAudio({
        releaseId: bundle.project.id,
        blob: pendingAudio.blob,
        fileName: pendingAudio.fileName,
        mimeType: pendingAudio.mimeType,
        sizeBytes: pendingAudio.sizeBytes,
        durationSec: audioProbe.durationSeconds,
        sampleRate: audioProbe.sampleRate,
        audioFormat: audioProbe.container,
        lossless: audioProbe.container === "wav" || audioProbe.container === "flac",
        title: bundle.project.title,
        artistName: bundle.project.artistName,
      });

      reportScan(scanProgress("done", 100));
      navigate(`/release/${bundle.project.id}`, { replace: true });
    } catch (err) {
      setErrorPhase("create");
      setError(err instanceof Error ? err.message : "Could not create release");
      setPhase("upload");
      setBusy(false);
      setScanProgressState(scanProgress("idle", 0));
      autoScanTriggered.current = false;
    }
  }, [artistName, busy, navigate, ownerId, pendingArt, pendingAudio, reportScan, title]);

  useEffect(() => {
    if (phase !== "upload" || busy || autoScanTriggered.current) return;
    if (!pendingAudio || !pendingArt) return;
    autoScanTriggered.current = true;
    void runScan();
  }, [busy, pendingArt, pendingAudio, phase, runScan]);

  async function pickAudio() {
    setError(null);
    setAudioProgress(20);
    try {
      const files = await bridge.files.selectAudio();
      setAudioProgress(70);
      const file = files[0];
      if (!file?.blob) {
        setAudioProgress(0);
        return;
      }
      const parsed = parseArtistTitleFromFilename(file.name);
      if (!title && parsed.titleFromName) setTitle(parsed.titleFromName);
      if (!artistName && parsed.artistFromName) setArtistName(parsed.artistFromName);
      setPendingAudio({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        blob: file.blob,
      });
      setAudioProgress(100);
    } catch (err) {
      setAudioProgress(0);
      if (err instanceof PlatformError && err.code === "cancelled") return;
      setErrorPhase("import");
      setError(err instanceof Error ? err.message : "Audio import failed");
    }
  }

  async function pickArtwork() {
    setError(null);
    setArtProgress(20);
    try {
      const files = await bridge.files.selectArtwork();
      setArtProgress(70);
      const file = files[0];
      if (!file?.blob) {
        setArtProgress(0);
        return;
      }
      setPendingArt({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        blob: file.blob,
      });
      setArtProgress(100);
    } catch (err) {
      setArtProgress(0);
      if (err instanceof PlatformError && err.code === "cancelled") return;
      setErrorPhase("import");
      setError(err instanceof Error ? err.message : "Artwork import failed");
    }
  }

  if (phase === "scanning") {
    return (
      <PrepareScanStage
        trackName={pendingAudio?.fileName ?? title}
        artName={pendingArt?.fileName}
        progress={scanProgressState}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl pb-8 md:pb-12" data-testid="prepare-new">
      <header className="text-center md:text-left">
        <p className="nexus-eyebrow">Your release</p>
        <h1 className="nexus-headline mt-2 text-2xl md:text-3xl">Drop your track. We&apos;ll tell you if it&apos;s ready.</h1>
        <p className="nexus-subline mt-2 text-sm">
          Measured in your browser. Your audio is not uploaded, and you can publish it to your
          catalog afterwards if you want it playable.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-3">
        <UploadTile
          label="Your track"
          hint="WAV, FLAC, or AIFF preferred"
          fileName={pendingAudio?.fileName ?? null}
          progress={audioProgress}
          complete={Boolean(pendingAudio)}
          onPick={() => void pickAudio()}
          testId="prepare-pick-audio"
          icon={Music2}
        />
        <UploadTile
          label="Cover art"
          hint="Square PNG or JPEG — 3000×3000 ideal"
          fileName={pendingArt?.fileName ?? null}
          progress={artProgress}
          complete={Boolean(pendingArt)}
          onPick={() => void pickArtwork()}
          testId="prepare-pick-art"
          icon={ImageIcon}
        />
      </div>

      {/* E2E + manual fallback — hidden fields keep test ids stable */}
      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void runScan();
        }}
      >
        <div className="sr-only">
          <label htmlFor="prepare-title">Title</label>
          <input
            id="prepare-title"
            data-testid="prepare-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="prepare-artist">Artist</label>
          <input
            id="prepare-artist"
            data-testid="prepare-artist"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />
        </div>

        {error ? (
          <StateView
            variant="error"
            title={errorPhase === "create" ? "Scan could not finish" : "Import error"}
            body={error}
          />
        ) : null}

        {!pendingAudio || !pendingArt ? (
          <Button type="submit" variant="forge" loading={busy} data-testid="prepare-create-submit">
            Run scan
          </Button>
        ) : (
          <p className="text-center text-xs text-white/40">Both files ready — starting live analysis…</p>
        )}
      </form>
    </div>
  );
}
