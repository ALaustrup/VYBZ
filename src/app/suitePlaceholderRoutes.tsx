import { Navigate, Route, useParams } from "react-router-dom";
import { SuitePlaceholderPage } from "@/pages/suite/SuiteProductPage";

function StudioIdRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/projects/${id}` : "/projects"} replace />;
}

/**
 * Suite placeholder + studio preserve routes.
 * Wire into App Routes when ready — do not import storefront here.
 */
export function suitePlaceholderRoutes() {
  return (
    <>
      <Route
        path="/start"
        element={
          <SuitePlaceholderPage
            product="home"
            title="Start a release"
            description="Begin a new release or project from Suite Home."
            phaseNote="Phase 2 — Start / Prepare intake."
          />
        }
      />
      <Route
        path="/releases"
        element={
          <SuitePlaceholderPage
            product="prepare"
            title="Releases"
            description="Your release list and Prepare rollup live here."
            phaseNote="Phase 2 — Prepare release list."
          />
        }
      />
      <Route
        path="/release/:id"
        element={
          <SuitePlaceholderPage
            product="prepare"
            title="Prepare workspace"
            description="Release readiness, findings, and hand-offs."
            phaseNote="Phase 2 — Prepare workspace."
          />
        }
      />
      <Route path="/studio" element={<Navigate to="/projects" replace />} />
      <Route path="/studio/:id" element={<StudioIdRedirect />} />
      <Route
        path="/credits"
        element={
          <SuitePlaceholderPage
            product="credits"
            title="Credit Passport"
            description="Normalize and approve credits before release."
            phaseNote="Phase 3 — Credits."
          />
        }
      />
      <Route
        path="/release/:id/credits"
        element={
          <SuitePlaceholderPage
            product="credits"
            title="Release credits"
            description="Credits scoped to this release."
            phaseNote="Phase 3 — Credits."
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
            phaseNote="Phase 4 — MasterReady."
          />
        }
      />
      <Route
        path="/release/:id/master"
        element={
          <SuitePlaceholderPage
            product="master"
            title="Master workspace"
            description="Mastering workspace for this release."
            phaseNote="Phase 4 — MasterReady."
          />
        }
      />
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
          <SuitePlaceholderPage
            product="market"
            title="Market"
            description="Digital marketplace for packs and support goods."
            phaseNote="Phase 8 — Market. Keep /tools/packs WIP until cutover."
          />
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
            phaseNote="Phase 1 — Settings placeholder."
          />
        }
      />
    </>
  );
}
