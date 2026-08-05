import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, Loader2, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/Progress";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { computeWaveform, sha256Hex, acousticSignature } from "@/lib/waveform";
import { clearPendingAudio, type PendingAudio } from "@/features/prepare/pendingUpload";

function extOf(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "wav";
}

/**
 * Opt-in bridge from a readiness scan to the catalog.
 *
 * The scan itself never uploads. This offers the upload explicitly, and only
 * while the analysed file is still held in memory for this session.
 */
export function PublishToCatalogCard({
  pending,
  onPublished,
}: {
  pending: PendingAudio;
  onPublished: (dropId: string) => void;
}) {
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");

  async function publish() {
    if (!userId) {
      showToast("Sign in to publish to your catalog");
      navigate("/enter");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      setStage("Reading waveform");
      const wave = await computeWaveform(pending.blob).catch(() => null);

      setStage("Uploading");
      const url = await api.uploadAudio(pending.blob, extOf(pending.fileName), setProgress);
      if (!url) {
        showToast("Upload failed — nothing was published");
        return;
      }

      setStage("Creating track");
      const sha = await sha256Hex(pending.blob).catch(() => undefined);
      const fingerprint = wave?.peaks ? await acousticSignature(wave.peaks).catch(() => undefined) : undefined;

      const drop = await api.createDrop({
        title: pending.title,
        seed: Math.floor(Math.random() * 1e9),
        assetKind: "track",
        audioUrl: url,
        waveform: wave?.peaks,
        // Prefer the decoded values; fall back to what the scan probed.
        durationSec: wave?.duration ?? pending.durationSec,
        audioFormat: pending.audioFormat,
        sampleRate: wave?.sampleRate ?? pending.sampleRate,
        lossless: pending.lossless,
        creditedArtist: pending.artistName ?? undefined,
        sha256: sha,
        fingerprint,
      });

      if (!drop) {
        showToast("Could not create the track");
        return;
      }
      clearPendingAudio(pending.releaseId);
      showToast("Published to your catalog");
      onPublished(drop.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <section className="forge-glass relative p-4" data-testid="publish-to-catalog">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1]">
        <p className="nexus-eyebrow flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Your audio stayed on this device
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
          The scan measured “{pending.fileName}” in your browser and stored only the results.
          Publish it to your catalog to make it playable, shareable and open to comments.
        </p>

        {busy ? (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span>{stage}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-1.5" label="Upload progress" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void publish()}
            data-testid="publish-to-catalog-button"
            className="forge-cta mt-3.5 gap-2"
          >
            <CloudUpload className="h-4 w-4" />
            Publish to your catalog
          </button>
        )}

        {busy && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35">
            <Loader2 className="h-3 w-3 animate-spin" /> Keep this tab open until it finishes.
          </p>
        )}

        <p className="mt-3 text-[10px] leading-snug text-white/25">
          Publishing uploads the file to VYBZ storage. Until you do, nothing is stored and this
          offer disappears if you reload.
        </p>
      </div>
    </section>
  );
}
