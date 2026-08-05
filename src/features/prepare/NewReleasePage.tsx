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
import type { AudioProbe, ArtworkProbe } from "@vybz/domain/releases";

type Phase = "upload" | "scanning";

const MIN_SCAN_MS = 2400;

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
            <Progress value={progress} className="mt-3" label={`${label} upload progress`} />
          ) : complete ? (
            <p className="mt-2 text-[11px] uppercase tracking-wide text-suite-success">Ready</p>
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
  const [audioMeta, setAudioMeta] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    probe: AudioProbe;
    /** Held in memory only, so the user can opt into publishing after the scan. */
    blob: Blob | null;
  } | null>(null);
  const [artMeta, setArtMeta] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    probe: ArtworkProbe;
  } | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [artProgress, setArtProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPhase, setErrorPhase] = useState<"import" | "create">("import");
  const autoScanTriggered = useRef(false);

  const runScan = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setPhase("scanning");
    const scanStarted = Date.now();
    try {
      const bundle = await createReleaseWithScan({
        ownerId,
        title: title || audioMeta?.probe.titleFromName || "Untitled release",
        artistName: artistName || audioMeta?.probe.artistFromName || null,
        audio: audioMeta,
        artwork: artMeta,
        idempotencyKey: crypto.randomUUID(),
      });
      try {
        await ensureMetadataCredits({
          ownerId,
          releaseId: bundle.project.id,
          artistName: artistName || audioMeta?.probe.artistFromName || null,
          composerName: audioMeta?.probe.composerFromName ?? null,
        });
      } catch {
        /* credits seed is best-effort */
      }
      // The scan never uploads. Keep the analysed audio in memory so the results
      // page can offer an explicit publish without asking for the file again.
      if (audioMeta?.blob) {
        stashPendingAudio({
          releaseId: bundle.project.id,
          blob: audioMeta.blob,
          fileName: audioMeta.fileName,
          mimeType: audioMeta.mimeType,
          sizeBytes: audioMeta.sizeBytes,
          durationSec: audioMeta.probe.durationSeconds,
          sampleRate: audioMeta.probe.sampleRate,
          audioFormat: audioMeta.probe.container,
          lossless: audioMeta.probe.container === "wav" || audioMeta.probe.container === "flac",
          title: bundle.project.title,
          artistName: bundle.project.artistName,
        });
      }

      const elapsed = Date.now() - scanStarted;
      if (elapsed < MIN_SCAN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SCAN_MS - elapsed));
      }
      navigate(`/release/${bundle.project.id}`, { replace: true });
    } catch (err) {
      setErrorPhase("create");
      setError(err instanceof Error ? err.message : "Could not create release");
      setPhase("upload");
      setBusy(false);
      autoScanTriggered.current = false;
    }
  }, [artistName, artMeta, audioMeta, busy, navigate, ownerId, title]);

  useEffect(() => {
    if (phase !== "upload" || busy || autoScanTriggered.current) return;
    if (!audioMeta || !artMeta) return;
    autoScanTriggered.current = true;
    void runScan();
  }, [artMeta, audioMeta, busy, phase, runScan]);

  async function pickAudio() {
    setError(null);
    setAudioProgress(12);
    try {
      const files = await bridge.files.selectAudio();
      setAudioProgress(45);
      const file = files[0];
      if (!file?.blob) {
        setAudioProgress(0);
        return;
      }
      setAudioProgress(68);
      const probe = await probeAudioFile({
        name: file.name,
        type: file.mimeType,
        size: file.sizeBytes,
        arrayBuffer: () => file.blob!.arrayBuffer(),
      });
      setAudioProgress(100);
      setAudioMeta({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        probe,
        blob: file.blob ?? null,
      });
      if (!title && probe.titleFromName) setTitle(probe.titleFromName);
      if (!artistName && probe.artistFromName) setArtistName(probe.artistFromName);
    } catch (err) {
      setAudioProgress(0);
      if (err instanceof PlatformError && err.code === "cancelled") return;
      setErrorPhase("import");
      setError(err instanceof Error ? err.message : "Audio import failed");
    }
  }

  async function pickArtwork() {
    setError(null);
    setArtProgress(12);
    try {
      const files = await bridge.files.selectArtwork();
      setArtProgress(45);
      const file = files[0];
      if (!file?.blob) {
        setArtProgress(0);
        return;
      }
      setArtProgress(68);
      const probe = await probeArtworkFile({
        name: file.name,
        type: file.mimeType,
        size: file.sizeBytes,
        arrayBuffer: () => file.blob!.arrayBuffer(),
      });
      setArtProgress(100);
      setArtMeta({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        probe,
      });
    } catch (err) {
      setArtProgress(0);
      if (err instanceof PlatformError && err.code === "cancelled") return;
      setErrorPhase("import");
      setError(err instanceof Error ? err.message : "Artwork import failed");
    }
  }

  if (phase === "scanning") {
    return (
      <PrepareScanStage trackName={audioMeta?.fileName ?? title} artName={artMeta?.fileName} />
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
          fileName={audioMeta?.fileName ?? null}
          progress={audioProgress}
          complete={Boolean(audioMeta)}
          onPick={() => void pickAudio()}
          testId="prepare-pick-audio"
          icon={Music2}
        />
        <UploadTile
          label="Cover art"
          hint="Square PNG or JPEG — 3000×3000 ideal"
          fileName={artMeta?.fileName ?? null}
          progress={artProgress}
          complete={Boolean(artMeta)}
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

        {!audioMeta || !artMeta ? (
          <Button type="submit" variant="forge" loading={busy} data-testid="prepare-create-submit">
            Run scan
          </Button>
        ) : (
          <p className="text-center text-xs text-white/40">Both files ready — starting scan…</p>
        )}
      </form>
    </div>
  );
}
