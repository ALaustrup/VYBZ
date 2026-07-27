import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "@/store/session";
import { DynamicBackground } from "@/components/DynamicBackground";
import { Onboarding, UsernameSetup } from "@/components/Onboarding";
import { RoleIntentOnboarding } from "@/components/RoleIntentOnboarding";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { ComposeSheet } from "@/components/ComposeSheet";
import { BulkUploadSheet } from "@/components/BulkUploadSheet";
import { GrainOverlay } from "@/components/GrainOverlay";
import { ReactiveFrame } from "@/components/ReactiveFrame";
import { VDock } from "@/components/vdock/VDock";
import { AppChrome } from "@/components/shell/AppChrome";
import { ensureEliteFxDefault } from "@/lib/display";
import { pageEnter } from "@/lib/motion";
import { BRAND_ACCENT, BRAND_BG, surfaceForPath } from "@/lib/surfaceTheme";
import { useResolvedCosmetics } from "@/lib/cosmetics";
import { BG_VARIANTS } from "@/lib/backgrounds";
import { Toast } from "@/components/Toast";
import { Confetti } from "@/components/Confetti";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandLockup } from "@/components/Brand";
import { LivingHomePage } from "@/pages/LivingHomePage";
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
import { LibraryPage } from "@/pages/LibraryPage";

export function App() {
  const { ready, userId, profile, backendEnabled } = useSession();
  const [feedKey, setFeedKey] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const location = useLocation();
  const surface = surfaceForPath(location.pathname);
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const equippedScene = cosmetics.backdrop?.bg;
  const shellBg =
    equippedScene && BG_VARIANTS.some((v) => v.id === equippedScene)
      ? equippedScene
      : surface.bg;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-rgb", BRAND_ACCENT);
    root.classList.add("accent-fade");
    ensureEliteFxDefault();
  }, []);

  const [onboarded, setOnboarded] = useState(false);
  const authed = !!userId && !!profile?.username;
  const needsMix = needsIntentMixIntake(profile?.profile);

  if (!backendEnabled) {
    return <div className="flex min-h-[100dvh] items-center justify-center px-8 text-center text-white/60">VYBZ backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>;
  }
  if (!ready) return <><DynamicBackground variant={BRAND_BG} /><div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div></>;

  const isPublicDoc = location.pathname.startsWith("/codex") || location.pathname.startsWith("/legal");
  if (!userId || !profile?.username) {
    if (isPublicDoc) return <PublicDocShell />;
    if (!userId) return <><DynamicBackground variant={BRAND_BG} /><Onboarding /></>;
    return <><DynamicBackground variant={BRAND_BG} /><UsernameSetup /></>;
  }

  if (!isPublicDoc && authed && needsMix && !onboarded) {
    return (
      <>
        <DynamicBackground variant={BRAND_BG} />
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
        className="h-full"
      >
      <Routes location={location}>
        <Route path="/" element={<LivingHomePage />} />
        <Route path="/feed" element={<FeedPage key={feedKey} onCompose={() => setComposeOpen(true)} />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/activity" element={<Navigate to="/" replace />} />
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
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mod" element={<ModPage />} />
        <Route path="/apply-mod" element={<ModApplyPage />} />
        <Route path="/store" element={<StorePage />} />
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
      <DynamicBackground variant={shellBg} />
      <GrainOverlay />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-paper-50/35" />
      <AppChrome
        stage={routes}
        dock={(
          <ErrorBoundary>
            <VDock onCompose={() => setComposeOpen(true)} />
          </ErrorBoundary>
        )}
      />
      <ComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
      <BulkUploadSheet open={bulkOpen} onClose={() => setBulkOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
      <MessagePopoutHost />
      <ReactiveFrame />
      <WelcomeTutorial />
      <Toast /><Confetti />
    </MessagePopoutProvider>
  );
}

function PublicDocShell() {
  const location = useLocation();
  return (
    <>
      <DynamicBackground variant={BRAND_BG} />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-paper-50/35" />
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="glass z-40 flex shrink-0 items-center gap-3 border-b border-paper-900/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/codex"><BrandLockup height="h-7" /></NavLink>
          <span className="ml-auto hidden text-xs text-paper-900/45 sm:block">Codex · Astra Matrix, Inc.</span>
          <NavLink to="/" className="btn btn-primary px-3 py-1.5 text-xs">Enter VYBZ</NavLink>
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
