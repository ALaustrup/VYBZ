import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StateView } from "@/components/states/StateView";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import { useSession } from "@/store/session";
import { createReleaseWithScan, getPrepareOwnerId } from "@/features/prepare/service";
import { ensureMetadataCredits } from "@/features/credits/service";
import { probeArtworkFile, probeAudioFile } from "@/features/prepare/probeClient";
import type { AudioProbe, ArtworkProbe } from "@vybz/domain/releases";

export function NewReleasePage() {
  const { userId } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const bridge = usePlatform();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [audioMeta, setAudioMeta] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    probe: AudioProbe;
  } | null>(null);
  const [artMeta, setArtMeta] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    probe: ArtworkProbe;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAudio() {
    setError(null);
    try {
      const files = await bridge.files.selectAudio();
      const file = files[0];
      if (!file?.blob) return;
      const probe = await probeAudioFile({
        name: file.name,
        type: file.mimeType,
        size: file.sizeBytes,
        arrayBuffer: () => file.blob!.arrayBuffer(),
      });
      setAudioMeta({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        probe,
      });
      if (!title && probe.titleFromName) setTitle(probe.titleFromName);
      if (!artistName && probe.artistFromName) setArtistName(probe.artistFromName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio import failed");
    }
  }

  async function pickArtwork() {
    setError(null);
    try {
      const files = await bridge.files.selectArtwork();
      const file = files[0];
      if (!file?.blob) return;
      const probe = await probeArtworkFile({
        name: file.name,
        type: file.mimeType,
        size: file.sizeBytes,
        arrayBuffer: () => file.blob!.arrayBuffer(),
      });
      setArtMeta({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        probe,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Artwork import failed");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const bundle = await createReleaseWithScan({
        ownerId,
        title: title || "Untitled release",
        artistName: artistName || null,
        audio: audioMeta,
        artwork: artMeta,
        idempotencyKey: crypto.randomUUID(),
      });
      await ensureMetadataCredits({
        ownerId,
        releaseId: bundle.project.id,
        artistName: artistName || audioMeta?.probe.artistFromName || null,
        composerName: audioMeta?.probe.composerFromName ?? null,
      });
      navigate(`/release/${bundle.project.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create release");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4 pb-28 md:p-8" data-testid="prepare-new">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-suite-cyan">Prepare</p>
      <h1 className="font-display text-2xl font-semibold text-snow">New release</h1>
      <p className="mt-1 text-sm text-fog">Free browser scan — no cloud compute.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Release title"
          data-testid="prepare-title"
        />
        <Input
          label="Primary artist"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Artist name"
          data-testid="prepare-artist"
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void pickAudio()} data-testid="prepare-pick-audio">
            {audioMeta ? `Audio: ${audioMeta.fileName}` : "Import audio"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void pickArtwork()} data-testid="prepare-pick-art">
            {artMeta ? `Art: ${artMeta.fileName}` : "Import artwork"}
          </Button>
        </div>

        {error ? <StateView variant="error" title="Import error" body={error} /> : null}

        <div className="flex gap-2">
          <Button type="submit" loading={busy} data-testid="prepare-create-submit">
            Create & scan
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/releases")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
