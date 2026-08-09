import * as api from "@/lib/api";
import { computeWaveform, sha256Hex, acousticSignature } from "@/lib/waveform";
import { clearPendingAudio, type PendingAudio } from "@/features/prepare/pendingUpload";

function extOf(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "wav";
}

/** Upload a session pending scan blob into the Library catalog (Drop). */
export async function publishPendingToLibrary(
  pending: PendingAudio,
  onProgress?: (pct: number) => void,
): Promise<{ ok: true; dropId: string } | { ok: false; reason: string }> {
  try {
    const wave = await computeWaveform(pending.blob).catch(() => null);
    const url = await api.uploadAudio(pending.blob, extOf(pending.fileName), onProgress);
    if (!url) return { ok: false, reason: "Upload failed" };

    const sha = await sha256Hex(pending.blob).catch(() => undefined);
    const fingerprint = wave?.peaks ? await acousticSignature(wave.peaks).catch(() => undefined) : undefined;

    const drop = await api.createDrop({
      title: pending.title,
      seed: Math.floor(Math.random() * 1e9),
      assetKind: "track",
      audioUrl: url,
      waveform: wave?.peaks,
      durationSec: wave?.duration ?? pending.durationSec,
      audioFormat: pending.audioFormat,
      sampleRate: wave?.sampleRate ?? pending.sampleRate,
      lossless: pending.lossless,
      creditedArtist: pending.artistName ?? undefined,
      sha256: sha,
      fingerprint,
    });
    if (!drop) return { ok: false, reason: "Could not create track" };
    clearPendingAudio(pending.releaseId);
    return { ok: true, dropId: drop.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Publish failed" };
  }
}
