import { TrackCard } from "@/components/TrackCard";
import type { Drop } from "@/types";

/**
 * Seeded fixture for the contextual track action system. Two drops with different
 * capability profiles so the spec can assert ownership gating and disabled reasons
 * without a signed-in session.
 *
 * Never reaches production — see `src/app/e2eFixtures.tsx`.
 */
const OWNED: Drop = {
  id: "fixture-owned",
  authorId: "fixture-viewer",
  authorUsername: "ada",
  title: "Neon Rain",
  body: null,
  seed: 42,
  feels: 3,
  wilds: 0,
  createdAt: Date.UTC(2026, 7, 1),
  assetId: "fixture-asset",
  audioUrl: "https://example.invalid/neon-rain.wav",
  durationSec: 185,
  audioFormat: "wav",
  sampleRate: 44100,
  lossless: true,
};

/** No asset and no playable URL, so download and playback must be disabled with reasons. */
const LIMITED: Drop = {
  ...OWNED,
  id: "fixture-limited",
  title: "Draft Idea",
  assetId: null,
  audioUrl: "",
  lossless: false,
};

export function TrackActionsE2EFixturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4" data-testid="track-actions-fixture">
      <h1 className="nexus-headline mb-4 text-xl">Track actions fixture</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <TrackCard drop={OWNED} queue={[OWNED]} compact />
        <TrackCard drop={LIMITED} queue={[LIMITED]} compact />
      </div>
    </div>
  );
}
