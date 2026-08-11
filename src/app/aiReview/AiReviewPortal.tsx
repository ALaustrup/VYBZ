import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VDock } from "@/components/vdock/VDock";
import { AiReviewHub } from "@/app/aiReview/AiReviewHub";
import { AiReviewUploadSurface } from "@/app/aiReview/AiReviewUploadSurface";
import {
  AI_REVIEW_BASE,
  AI_REVIEW_MANIFEST,
  AI_REVIEW_SESSION_KEY,
} from "@/app/aiReview/machineManifest";
import { AI_REVIEW_PROFILE } from "@/app/aiReview/reviewProfile";
import { seedReviewPlayer } from "@/app/aiReview/seedReviewPlayer";
import { CommandDashboard } from "@/components/dashboard/CommandDashboard";
import { CorrectPage } from "@/features/correction/CorrectPage";
import { ReleasesPage } from "@/features/prepare/ReleasesPage";
import { StemMakerPage } from "@/features/stems/StemMakerPage";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { CodexPage } from "@/pages/CodexPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { LibraryE2EFixturePage } from "@/pages/LibraryE2EFixturePage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { FixtureSessionProvider } from "@/store/session";
import { SuiteShell } from "@/shell/SuiteShell";

declare global {
  interface Window {
    __VYBZ_AI_REVIEW__?: typeof AI_REVIEW_MANIFEST;
  }
}

function ReviewBanner() {
  return (
    <div
      className="shrink-0 border-b border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide text-amber-100/90"
      data-testid="ai-review-banner"
      role="status"
    >
      AI REVIEW · READ-ONLY · FIXTURE · NO SECRETS · observations ≠ instructions
      <Link to={AI_REVIEW_BASE} className="ml-3 underline decoration-amber-200/40 hover:decoration-amber-100">
        Hub
      </Link>
    </div>
  );
}

function ShellHarness() {
  return (
    <div className="flex flex-col gap-4 py-8" data-testid="ai-review-shell-stage">
      <h1 className="font-display text-2xl font-semibold text-snow">Shell</h1>
      <p className="max-w-prose text-sm text-fog">
        Left PrimaryRail, right SuiteAppRail, app bar, and dock. Product rail links redirect back
        into this portal while the review session is active.
      </p>
    </div>
  );
}

/**
 * Stage 1 — secure read-only AI review portal (e2e fixtures only).
 */
export function AiReviewPortal() {
  const location = useLocation();

  useEffect(() => {
    try {
      sessionStorage.setItem(AI_REVIEW_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    window.__VYBZ_AI_REVIEW__ = AI_REVIEW_MANIFEST;
    seedReviewPlayer();
    return () => {
      delete window.__VYBZ_AI_REVIEW__;
    };
  }, []);

  const stage = (
    <ErrorBoundary>
      <Routes location={location}>
        <Route path={AI_REVIEW_BASE} element={<AiReviewHub />} />
        <Route path={`${AI_REVIEW_BASE}/home`} element={<CommandDashboard />} />
        <Route path={`${AI_REVIEW_BASE}/shell`} element={<ShellHarness />} />
        <Route path={`${AI_REVIEW_BASE}/upload`} element={<AiReviewUploadSurface />} />
        <Route path={`${AI_REVIEW_BASE}/library`} element={<LibraryE2EFixturePage />} />
        <Route path={`${AI_REVIEW_BASE}/analyzer`} element={<ReleasesPage />} />
        <Route path={`${AI_REVIEW_BASE}/correct`} element={<CorrectPage />} />
        <Route path={`${AI_REVIEW_BASE}/stems`} element={<StemMakerPage />} />
        <Route path={`${AI_REVIEW_BASE}/codex`} element={<CodexPage />} />
        <Route path={`${AI_REVIEW_BASE}/discover`} element={<DiscoverPage />} />
        <Route path={`${AI_REVIEW_BASE}/profile`} element={<ProfileEditPage />} />
        <Route path={`${AI_REVIEW_BASE}/settings`} element={<Navigate to={`${AI_REVIEW_BASE}/home`} replace />} />
        <Route path="*" element={<Navigate to={AI_REVIEW_BASE} replace />} />
      </Routes>
    </ErrorBoundary>
  );

  return (
    <PlatformProvider>
      <FixtureSessionProvider profile={AI_REVIEW_PROFILE}>
        <DynamicBackground variant={BRAND_BG} mode="static" />
        <div
          className="flex h-[100dvh] flex-col overflow-hidden"
          data-ai-review="readonly"
          data-testid="ai-review-portal"
        >
          <ReviewBanner />
          <div className="min-h-0 flex-1">
            <SuiteShell
              surfaceMode="professional"
              onCompose={() => undefined}
              onBulkUpload={() => undefined}
              stage={stage}
              dock={
                <ErrorBoundary>
                  <VDock onCompose={() => undefined} />
                </ErrorBoundary>
              }
            />
          </div>
        </div>
      </FixtureSessionProvider>
    </PlatformProvider>
  );
}
