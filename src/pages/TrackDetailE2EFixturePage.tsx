import { TrackDetailPage } from "@/pages/TrackDetailPage";

/**
 * Renders the real track detail page with no backend reachable. The lookup fails,
 * which exercises the unavailable path: the page must say so and offer a way back
 * rather than rendering an empty shell of panels.
 *
 * Never reaches production — see `src/app/e2eFixtures.tsx`.
 */
export function TrackDetailE2EFixturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4" data-testid="track-detail-fixture">
      <TrackDetailPage />
    </div>
  );
}
