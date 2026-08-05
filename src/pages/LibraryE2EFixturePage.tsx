import { UploadsLibrary } from "@/components/UploadsLibrary";
import type { Drop } from "@/types";

/**
 * Seeded catalog for the media library spec: search, filters, sort, view switching,
 * multi-select and batch. Never reaches production — see `src/app/e2eFixtures.tsx`.
 */
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function seed(over: Partial<Drop> & { id: string; title: string }): Drop {
  return {
    authorId: "fixture-viewer",
    authorUsername: "ada",
    body: null,
    seed: 7,
    feels: 0,
    wilds: 0,
    createdAt: NOW,
    ...over,
  };
}

const DROPS: Drop[] = [
  seed({
    id: "lib-1",
    title: "Neon Rain",
    album: "Night Drive",
    audioFormat: "wav",
    sampleRate: 44100,
    lossless: true,
    durationSec: 200,
    plays: 50,
    feels: 9,
    assetId: "as-1",
    createdAt: NOW - DAY,
  }),
  seed({
    id: "lib-2",
    title: "Dust",
    album: "Night Drive",
    audioFormat: "mp3",
    sampleRate: 44100,
    durationSec: 45,
    plays: 5,
    createdAt: NOW - 20 * DAY,
  }),
  seed({
    id: "lib-3",
    title: "Aurora",
    audioFormat: "flac",
    sampleRate: 96000,
    lossless: true,
    durationSec: 400,
    plays: 120,
    assetId: "as-3",
    createdAt: NOW - 100 * DAY,
  }),
  seed({ id: "lib-4", title: "Untitled sketch", createdAt: NOW - 400 * DAY }),
];

export function LibraryE2EFixturePage() {
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-5xl flex-col px-4 py-3" data-testid="library-fixture">
      <UploadsLibrary initialDrops={DROPS} featuredId="lib-1" />
    </div>
  );
}
