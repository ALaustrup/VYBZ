import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { CollabWorkspace } from "@/features/collab/CollabWorkspace";
import {
  resetCollabSession,
  resetLocalMergeDocs,
  seedCollabDemo,
  setClientBaseVersion,
  setLocalReleaseDoc,
} from "@/platform/collab";

const RELEASE_ID = "e2e-collab-release";

/** Playwright fixture — presence, cursors, comments, merge conflict without auth. */
export function CollabSessionsE2EFixturePage() {
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    resetLocalMergeDocs();
    seedCollabDemo(RELEASE_ID);
    // Pre-seed a stale client base vs remote doc so Save immediately conflicts.
    setClientBaseVersion(RELEASE_ID, 1);
    setLocalReleaseDoc(RELEASE_ID, {
      title: "Server Title",
      artist_name: null,
      rowVersion: 2,
    });
    setSeeded(true);
    return () => {
      resetCollabSession(RELEASE_ID);
      resetLocalMergeDocs();
    };
  }, []);

  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 min-h-[100dvh]" data-testid="collab-e2e-fixture">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">Collab Sessions · e2e</p>
        </header>
        <div className="mx-auto max-w-3xl p-4 md:p-8">
          {seeded ? (
            <CollabWorkspace
              releaseId={RELEASE_ID}
              userId="e2e-self"
              username="you"
              pane="prepare"
              showMerge
              seedMergeConflict
            >
              <p className="text-sm text-fog" data-testid="collab-pane-hint">
                Prepare pane · move pointer to broadcast cursor
              </p>
            </CollabWorkspace>
          ) : null}
        </div>
      </div>
    </>
  );
}
