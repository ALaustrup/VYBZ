import { Navigate, Route, useParams } from "react-router-dom";
import { SuitePlaceholderPage } from "@/pages/suite/SuiteProductPage";
import { ReleasesPage } from "@/features/prepare/ReleasesPage";
import { NewReleasePage } from "@/features/prepare/NewReleasePage";
import { ReleaseDetailPage } from "@/features/prepare/ReleaseDetailPage";
import { ReleaseCreditsPage } from "@/features/credits/ReleaseCreditsPage";
import { DistributionReportPage } from "@/features/distribution/DistributionReportPage";
import { DesktopBatchPanel } from "@/features/processing/DesktopBatchPanel";
import { WaveformPreviewPage } from "@/pages/WaveformPreviewPage";
import { AndroidBetaPage } from "@/pages/AndroidBetaPage";
import { ReleaseMasterPane } from "@/features/mastering/ReleaseMasterPane";
import { FLAGS } from "@/lib/flags";

function StudioIdRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/projects/${id}` : "/projects"} replace />;
}

/**
 * Suite Prepare MVP + placeholders + studio preserve routes.
 * Do not import storefront here.
 */
export function suitePlaceholderRoutes() {
  return (
    <>
      <Route path="/start" element={<NewReleasePage />} />
      <Route path="/releases" element={<ReleasesPage />} />
      <Route path="/releases/new" element={<NewReleasePage />} />
      <Route path="/release/:id" element={<ReleaseDetailPage />} />
      <Route path="/release/:id/credits" element={<ReleaseCreditsPage />} />
      <Route path="/release/:id/distribution" element={<DistributionReportPage />} />
      <Route path="/desktop/process" element={<DesktopBatchPanel />} />
      <Route path="/desktop/waveform" element={<WaveformPreviewPage />} />
      <Route path="/mobile/uploads" element={<AndroidBetaPage />} />
      <Route path="/android/beta" element={<AndroidBetaPage />} />
      <Route path="/studio" element={<Navigate to="/projects" replace />} />
      <Route path="/studio/:id" element={<StudioIdRedirect />} />
      <Route
        path="/credits"
        element={
          <SuitePlaceholderPage
            product="credits"
            title="Credit Passport"
            description="Normalize and approve credits before release."
            phaseNote="Phase 3 — Open a release, then Credits on that release."
          />
        }
      />
      <Route
        path="/master"
        element={
          <SuitePlaceholderPage
            product="master"
            title="MasterReady"
            description="Loudness, peaks, and master delivery checks."
            phaseNote="Phase 15 — Open a release, then Master on that release (/release/:id/master)."
          />
        }
      />
      <Route path="/release/:id/master" element={<ReleaseMasterPane />} />
      <Route
        path="/coverlab"
        element={
          <SuitePlaceholderPage
            product="coverlab"
            title="CoverLab"
            description="Artwork, stills, and cover systems."
            phaseNote="Phase 5 — CoverLab."
          />
        }
      />
      <Route
        path="/release/:id/artwork"
        element={
          <SuitePlaceholderPage
            product="coverlab"
            title="Release artwork"
            description="Artwork pipeline for this release."
            phaseNote="Phase 5 — CoverLab."
          />
        }
      />
      <Route
        path="/sentinel"
        element={
          <SuitePlaceholderPage
            product="sentinel"
            title="Sentinel"
            description="Secure rooms, watermark, and evidentiary protect."
            phaseNote="Phase 6 — Sentinel."
          />
        }
      />
      <Route
        path="/sentinel/:id"
        element={
          <SuitePlaceholderPage
            product="sentinel"
            title="Secure room"
            description="A protected Sentinel room."
            phaseNote="Phase 6 — Sentinel."
          />
        }
      />
      <Route
        path="/relay"
        element={
          <SuitePlaceholderPage
            product="relay"
            title="Relay"
            description="Distribution dashboard and delivery status."
            phaseNote="Phase 7 — Relay."
          />
        }
      />
      <Route
        path="/release/:id/delivery"
        element={
          <SuitePlaceholderPage
            product="relay"
            title="Delivery"
            description="Delivery partners and package status for this release."
            phaseNote="Phase 7 — Relay."
          />
        }
      />
      <Route
        path="/market"
        element={
          FLAGS.storefront ? (
            <Navigate to="/tools/packs" replace />
          ) : (
            <SuitePlaceholderPage
              product="market"
              title="Market"
              description="Digital marketplace for packs and support goods."
              phaseNote="Enable VITE_FEATURE_STOREFRONT (default on) for Sample Pack Storefront."
            />
          )
        }
      />
      <Route
        path="/wallet"
        element={
          <SuitePlaceholderPage
            product="home"
            title="Wallet"
            description="Earnings, Vc, and payouts — Suite wallet page."
            phaseNote="Phase 1 — Wallet page placeholder (replaces tab redirect)."
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SuitePlaceholderPage
            product="home"
            title="Settings"
            description="Account, privacy, and Suite preferences."
            phaseNote="Cost Sentinel: /settings/costs · AI minutes: /settings/credits."
          />
        }
      />
    </>
  );
}
