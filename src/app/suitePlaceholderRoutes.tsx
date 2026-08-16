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
            title="Credits"
            description="Names and splits on a release."
            phaseNote="Open a release, then Credits."
          />
        }
      />
      <Route
        path="/master"
        element={
          <SuitePlaceholderPage
            product="master"
            title="Master"
            description="Loudness, peaks, and the master."
            phaseNote="Open a release, then Master."
          />
        }
      />
      <Route path="/release/:id/master" element={<ReleaseMasterPane />} />
      <Route
        path="/coverlab"
        element={
          <SuitePlaceholderPage
            product="coverlab"
            title="Cover"
            description="Artwork and stills."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/release/:id/artwork"
        element={
          <SuitePlaceholderPage
            product="coverlab"
            title="Release art"
            description="Cover art for this release."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/sentinel"
        element={
          <SuitePlaceholderPage
            product="sentinel"
            title="Sentinel"
            description="Private rooms and watermarks."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/sentinel/:id"
        element={
          <SuitePlaceholderPage
            product="sentinel"
            title="Private room"
            description="A locked room."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/relay"
        element={
          <SuitePlaceholderPage
            product="relay"
            title="Relay"
            description="Where the release was sent."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/release/:id/delivery"
        element={
          <SuitePlaceholderPage
            product="relay"
            title="Delivery"
            description="Where this release was sent."
            phaseNote="Not built yet."
          />
        }
      />
      {!FLAGS.storefront ? (
        <Route
          path="/market"
          element={
            <SuitePlaceholderPage
              product="market"
              title="Shop"
              description="Packs for sale."
              phaseNote="Turn on VITE_FEATURE_STOREFRONT to open the shop."
            />
          }
        />
      ) : null}
      <Route
        path="/wallet"
        element={
          <SuitePlaceholderPage
            product="home"
            title="Wallet"
            description="Earnings and payouts."
            phaseNote="Not built yet."
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SuitePlaceholderPage
            product="home"
            title="Settings"
            description="Account and privacy."
            phaseNote="Use Edit profile for now."
          />
        }
      />
    </>
  );
}
