import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Routes, Route, Navigate, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "@/store/session";
import { DynamicBackground } from "@/components/DynamicBackground";
import { LandingPage } from "@/pages/LandingPage";
import { Onboarding, UsernameSetup } from "@/components/Onboarding";
import { RoleIntentOnboarding } from "@/components/RoleIntentOnboarding";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { ComposeSheet } from "@/components/ComposeSheet";
import { BulkUploadSheet } from "@/components/BulkUploadSheet";
import { GrainOverlay } from "@/components/GrainOverlay";
import { ReactiveFrame } from "@/components/ReactiveFrame";
import { VDock } from "@/components/vdock/VDock";
import { SuiteShell } from "@/shell/SuiteShell";
import { suitePlaceholderRoutes } from "@/app/suitePlaceholderRoutes";
import { ensureEliteFxDefault } from "@/lib/display";
import { pageEnter } from "@/lib/motion";
import { BRAND_BG, surfaceForPath } from "@/lib/surfaceTheme";
import { useResolvedCosmetics } from "@/lib/cosmetics";
import { BG_VARIANTS } from "@/lib/backgrounds";
import { Toast } from "@/components/Toast";
import { Confetti } from "@/components/Confetti";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandLockup } from "@/components/Brand";
import { cx } from "@/lib/utils";
import { FeedPage } from "@/pages/FeedPage";
import { needsIntentMixIntake } from "@/lib/intentMix";
import { ConnectPage } from "@/pages/ConnectPage";
import { SparkPage } from "@/pages/SparkPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { ProjectPage } from "@/pages/ProjectPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { MessagePopoutProvider } from "@/lib/messagePopout";
import { MessagePopoutHost } from "@/components/MessagePopout";
import { CamCallProvider } from "@/lib/camCall";
import { CamCallOverlay } from "@/components/CamCallOverlay";
import { VideoMessageHost } from "@/components/VideoMessageHost";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectRoomPage } from "@/pages/ProjectRoomPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { RoomPage } from "@/pages/RoomPage";
import { CodexPage } from "@/pages/CodexPage";
import { CodexDocPage } from "@/pages/CodexDocPage";
import { AdminPage } from "@/pages/AdminPage";
import { ModPage } from "@/pages/ModPage";
import { ModApplyPage } from "@/pages/ModApplyPage";
import { StorePage } from "@/pages/StorePage";
import { LivePage } from "@/pages/LivePage";
import { LiveWatchPage } from "@/pages/LiveWatchPage";
import { SocialPage } from "@/pages/SocialPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ArtistPage } from "@/pages/ArtistPage";
import { AmbientRadioHost } from "@/components/AmbientRadioHost";
import { ListenEarnHost } from "@/components/ListenEarnHost";
import { LibraryPage } from "@/pages/LibraryPage";
import { VisualizerTutorialPage } from "@/pages/VisualizerTutorialPage";
import { VisualizerStudioPage } from "@/pages/VisualizerStudioPage";
import { FLAGS } from "@/lib/flags";
import { isPreparePath, PrepareLocalApp } from "@/features/prepare/PrepareLocalApp";
import { DesktopLocalApp, isDesktopLocalPath } from "@/platform/desktop/DesktopLocalApp";
import { AndroidLocalApp, isAndroidLocalPath } from "@/platform/android/AndroidLocalApp";
import { StorefrontDashboardPage } from "@/pages/StorefrontDashboardPage";
import { StorefrontEditorPage } from "@/pages/StorefrontEditorPage";
import { StorefrontPackPage } from "@/pages/StorefrontPackPage";
import { StorefrontOrdersE2EFixturePage } from "@/pages/StorefrontOrdersE2EFixturePage";
import { CostSentinelDashboardPage } from "@/features/costs/CostSentinelDashboardPage";
import { CostSentinelE2EFixturePage } from "@/pages/CostSentinelE2EFixturePage";
import { MasteringE2EFixturePage } from "@/pages/MasteringE2EFixturePage";
import { CollabSessionsE2EFixturePage } from "@/pages/CollabSessionsE2EFixturePage";

export function App() {
  const { ready, userId, profile, backendEnabled } = useSession();
  const [feedKey, setFeedKey] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const surface = surfaceForPath(location.pathname);
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const equippedScene = cosmetics.backdrop?.bg;
  const shellBg =
    equippedScene && BG_VARIANTS.some((v) => v.id === equippedScene)
      ? equippedScene
      : surface.bg;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-rgb", surface.accent);
    root.dataset.surfaceMode = surface.mode ?? "audience";
    root.classList.add("accent-fade");
    ensureEliteFxDefault();
  }, [surface.accent, surface.mode]);

  // Studio "Use on next drop" â†’ /?compose=1 opens Compose with IndexedDB backdrop handoff
  useEffect(() => {
    if (searchParams.get("compose") !== "1") return;
    setComposeOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("compose");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [onboarded, setOnboarded] = useState(false);
  const authed = !!userId && !!profile?.username;
  const needsMix = needsIntentMixIntake(profile?.profile);

  // Playwright fixtures — bypass auth / backend gates (same pattern for all __e2e__ shells).
  if (location.pathname === "/__e2e__/mastering") {
    return <MasteringE2EFixturePage />;
  }
  if (location.pathname === "/__e2e__/cost-sentinel") {
    return <CostSentinelE2EFixturePage />;
  }
  if (location.pathname === "/__e2e__/collab") {
    return <CollabSessionsE2EFixturePage />;
  }
  if (FLAGS.storefront && location.pathname === "/__e2e__/storefront-orders") {
    return <StorefrontOrdersE2EFixtureShell />;
  }

  if (!backendEnabled) {
    if (FLAGS.prepare && isPreparePath(location.pathname)) {
      return <PrepareLocalApp />;
    }
    if (isDesktopLocalPath(location.pathname)) {
      return <DesktopLocalApp />;
    }
    if (isAndroidLocalPath(location.pathname)) {
      return <AndroidLocalApp />;
    }
    return <div className="flex min-h-[100dvh] items-center justify-center px-8 text-center text-white/60">VYBZ backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>;
  }
  if (!ready) return <><DynamicBackground variant={BRAND_BG} mode="static" /><div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div></>;

  const isPublicDoc = location.pathname.startsWith("/codex") || location.pathname.startsWith("/legal");
  const isPublicPack = FLAGS.storefront && location.pathname.startsWith("/pack/");
  if (!userId) {
    if (FLAGS.prepare && isPreparePath(location.pathname)) {
      return <PrepareLocalApp />;
    }
    if (isDesktopLocalPath(location.pathname)) {
      return <DesktopLocalApp />;
    }
    if (isAndroidLocalPath(location.pathname)) {
      return <AndroidLocalApp />;
    }
    if (isPublicPack) return <PublicPackShell />;
    if (isPublicDoc) return <PublicDocShell />;
    if (location.pathname === "/enter" || location.pathname.startsWith("/enter/")) {
      return <><DynamicBackground variant={BRAND_BG} mode="static" /><Onboarding /></>;
    }
    return <LandingPage />;
  }
  // Signed in â€” wait for profile before deciding username vs hub (avoids false UsernameSetup).
  if (!profile) {
    return <><DynamicBackground variant={BRAND_BG} mode="static" /><div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div></>;
  }
  if (!profile.username) {
    if (isPublicDoc) return <PublicDocShell />;
    return <><DynamicBackground variant={BRAND_BG} mode="static" /><UsernameSetup /></>;
  }

  if (!isPublicDoc && authed && needsMix && !onboarded) {
    return (
      <>
        <DynamicBackground variant={BRAND_BG} mode="static" />
        <RoleIntentOnboarding onComplete={() => setOnboarded(true)} />
      </>
    );
  }

  const routes = (
    <ErrorBoundary key={location.pathname}>
      <motion.div
        key={location.pathname}
        initial={pageEnter.initial}
        animate={pageEnter.animate}
        transition={pageEnter.transition}
        className="h-full min-h-0"
      >
      <Routes location={location}>
        <Route path="/" element={<ProfilePage />} />
        <Route path="/feed" element={<FeedPage key={feedKey} onCompose={() => setComposeOpen(true)} />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/activity" element={<Navigate to="/?tab=live" replace />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/spark" element={<SparkPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/projects" element={<ProjectsPage onBulkUpload={() => setBulkOpen(true)} />} />
        <Route path="/projects/:id" element={<ProjectRoomPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/live/:id" element={<LiveWatchPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<MessagesPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:id" element={<RoomPage />} />
        <Route path="/profile" element={<LegacyProfileRedirect />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/visuals/tutorial" element={<VisualizerTutorialPage />} />
        <Route path="/visuals/studio" element={<VisualizerStudioPage />} />
        {FLAGS.storefront ? (
          <>
            <Route path="/tools/packs" element={<StorefrontDashboardPage />} />
            <Route path="/tools/packs/new" element={<StorefrontEditorPage />} />
            <Route path="/tools/packs/:id/edit" element={<StorefrontEditorPage />} />
            <Route path="/pack/:slug" element={<StorefrontPackPage />} />
            <Route path="/market" element={<Navigate to="/tools/packs" replace />} />
          </>
        ) : null}
        <Route path="/settings/costs" element={<CostSentinelDashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mod" element={<ModPage />} />
        <Route path="/apply-mod" element={<ModApplyPage />} />
        <Route path="/store" element={<StorePage />} />
        {suitePlaceholderRoutes()}
        <Route path="/u/:id" element={<UserProfilePage />} />
        <Route path="/artist/:slug" element={<ArtistPage />} />
        <Route path="/p/:id" element={<ProjectPage />} />
        <Route path="/codex" element={<CodexPage />} />
        <Route path="/codex/:slug" element={<CodexDocPage />} />
        <Route path="/legal/:slug" element={<CodexDocPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </motion.div>
    </ErrorBoundary>
  );

  return (
    <MessagePopoutProvider>
      <CamCallProvider>
        <DynamicBackground variant={shellBg} />
        <GrainOverlay />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-paper-50/35" />
        <SuiteShell
          stage={routes}
          surfaceMode={surface.mode ?? "audience"}
          onCompose={() => setComposeOpen(true)}
          onBulkUpload={() => setBulkOpen(true)}
          dock={(
            <ErrorBoundary>
              {/* Hide dock under upload sheets so Release / originality CTAs stay tappable */}
              <div className={cx((composeOpen || bulkOpen) && "invisible pointer-events-none")}>
                <VDock onCompose={() => setComposeOpen(true)} />
              </div>
            </ErrorBoundary>
          )}
        />
        <ComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
        <BulkUploadSheet open={bulkOpen} onClose={() => setBulkOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
        <AmbientRadioHost />
        <ListenEarnHost />
        <MessagePopoutHost />
        <CamCallOverlay />
        <VideoMessageHost />
        <ReactiveFrame />
        <WelcomeTutorial />
        <Toast /><Confetti />
      </CamCallProvider>
    </MessagePopoutProvider>
  );
}

function StorefrontOrdersE2EFixtureShell() {
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <div className="min-h-[100dvh] bg-abyss-950/80">
        <StorefrontOrdersE2EFixturePage />
      </div>
    </>
  );
}

function PublicPackShell() {
  const location = useLocation();
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-paper-50/35" />
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="glass z-40 flex shrink-0 items-center gap-3 border-b border-paper-900/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/"><BrandLockup height="h-7" /></NavLink>
          <span className="ml-auto hidden text-xs text-paper-900/45 sm:block">Sample pack · VYBZ Market</span>
          <NavLink to="/enter" className="btn btn-primary px-3 py-1.5 text-xs">Enter VYBZ</NavLink>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-auto" data-testid="public-pack-main">
          <ErrorBoundary key={location.pathname}>
            <Routes location={location}>
              <Route path="/pack/:slug" element={<StorefrontPackPage publicShell />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

function PublicDocShell() {
  const location = useLocation();
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-paper-50/35" />
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="glass z-40 flex shrink-0 items-center gap-3 border-b border-paper-900/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/codex"><BrandLockup height="h-7" /></NavLink>
          <span className="ml-auto hidden text-xs text-paper-900/45 sm:block">Codex Â· Astra Matrix, Inc.</span>
          <NavLink to="/enter" className="btn btn-primary px-3 py-1.5 text-xs">Enter VYBZ</NavLink>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-hidden">
          <ErrorBoundary key={location.pathname}>
            <Routes location={location}>
              <Route path="/codex" element={<CodexPage />} />
              <Route path="/codex/:slug" element={<CodexDocPage />} />
              <Route path="/legal/:slug" element={<CodexDocPage />} />
              <Route path="*" element={<Navigate to="/codex" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

/** Map legacy /profile?tab=â€¦ onto the dashboard home. */
function LegacyProfileRedirect() {
  const [params] = useSearchParams();
  const tab = params.get("tab");
  const mapped =
    tab === "inbox" ? "you"
    : tab === "match" ? "connect"
    : tab === "live" || tab === "you" || tab === "listen" || tab === "wallet" || tab === "hub" || tab === "connect"
      ? tab
      : "hub";
  return <Navigate to={`/?tab=${mapped}`} replace />;
}
