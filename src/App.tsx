import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { ContextRail } from "@/components/ContextRail";
import { DynamicBackground } from "@/components/DynamicBackground";
import { Confetti } from "@/components/Confetti";
import { Onboarding } from "@/components/Onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tutorial } from "@/components/Tutorial";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useApp } from "@/store/AppStore";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cx } from "@/lib/utils";
import { pageTransition as pageTransitionMeta } from "@/lib/transitions";
import { ComposeSheet } from "@/components/ComposeSheet";
import { ConnectionSheet } from "@/components/ConnectionSheet";
import { InboxSheet } from "@/components/InboxSheet";
import { FriendChatSheet } from "@/components/FriendChatSheet";
import { PostSheet } from "@/components/PostSheet";
import { MediaViewer } from "@/components/MediaViewer";
import { PushPrompt } from "@/components/PushPrompt";
import { LifelineSheet } from "@/components/LifelineSheet";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { installMediaGuard } from "@/lib/mediaGuard";
import { PremiumSheet } from "@/components/PremiumSheet";
import { AccountGate } from "@/components/AccountGate";
import { Toast } from "@/components/Toast";
import { NotificationPopup } from "@/components/NotificationPopup";
import { UploadIndicator } from "@/components/UploadIndicator";
import { FeedsPage } from "@/pages/FeedsPage";
import { ForYouPage } from "@/pages/ForYouPage";
import { MatchmakingPage } from "@/pages/MatchmakingPage";
import { SparkPage } from "@/pages/SparkPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AdminPage } from "@/pages/AdminPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { ChatHubPage } from "@/pages/ChatHubPage";
import { CircleChatPage } from "@/pages/CircleChatPage";
import { LegalPage } from "@/pages/LegalPage";

// Heavy Three.js scene — code-split so it only loads when entering MYVYB XR.
const XRPage = lazy(() =>
  import("@/pages/XRPage").then((m) => ({ default: m.XRPage }))
);
// LiveKit SDK is heavy; only load it when entering /live.
const LivePage = lazy(() =>
  import("@/pages/LivePage").then((m) => ({ default: m.LivePage }))
);

// Wraps each routed page in the chosen enter/exit motion (Godmode-customizable).
function Page({
  children,
  transition,
}: {
  children: React.ReactNode;
  transition: string;
}) {
  const t = pageTransitionMeta(transition);
  return (
    <motion.div
      initial={t.initial}
      animate={t.animate}
      exit={t.exit}
      transition={t.transition}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export function App() {
  const location = useLocation();
  const { account, authLoading, bgVariant, pageTransition, isOnline, celebrate, showToast } =
    useApp();

  // Block right-click / drag / save on user-uploaded media platform-wide.
  useEffect(() => installMediaGuard(), []);

  // Welcome animation right after a new member finishes signup.
  useEffect(() => {
    if (!account) return;
    try {
      if (localStorage.getItem("veiled.justJoined")) {
        localStorage.removeItem("veiled.justJoined");
        celebrate("Welcome to MYVYB ✨");
      }
    } catch {
      /* ignore */
    }
  }, [account, celebrate]);

  // One-time nudge for a brand-new guest: point them to make their auto-issued
  // username their own (and, implicitly, to create an account later). Keyed on a
  // stable boolean so hydration re-renders don't cancel the pending timer.
  const isGuest = !!account && account.anonymous;
  useEffect(() => {
    if (!isGuest) return;
    try {
      if (localStorage.getItem("veiled.usernameNudge")) return;
      localStorage.setItem("veiled.usernameNudge", "1");
    } catch {
      return;
    }
    const t = window.setTimeout(() => {
      showToast("Make it yours — rename your username in Settings → Customize Username");
    }, 2200);
    return () => window.clearTimeout(t);
  }, [isGuest, showToast]);
  // Device-class adaptive layout: phone column on mobile, a full-screen
  // sidebar + content + context-rail shell on desktop/laptop. (VR is /xr.)
  const desktop = useMediaQuery("(min-width: 1024px)");
  const wide = useMediaQuery("(min-width: 768px)");
  const isConversation =
    location.pathname.startsWith("/rooms") ||
    /^\/circles\/.+/.test(location.pathname);
  const columnMax = wide && isConversation ? "max-w-3xl" : "max-w-md";
  // Desktop content width: conversations get the most room (two-column chat),
  // the feed widens for a multi-column Wall, everything else stays a calm column.
  const desktopMax = isConversation
    ? "max-w-5xl"
    : location.pathname === "/"
      ? "max-w-4xl"
      : "max-w-2xl";

  // Public policy pages — always reachable, with or without an account, so
  // legally required links work pre-sign-in and from external/checkout links.
  if (location.pathname.startsWith("/legal")) {
    return (
      <Routes location={location} key={location.pathname}>
        <Route path="/legal/:doc" element={<LegalPage />} />
        <Route path="/legal" element={<LegalPage />} />
      </Routes>
    );
  }

  // MYVYB XR — immersive WebXR. Reachable with or without an account so a Quest
  // headset (or the packaged Quest app) can launch straight into it.
  if (location.pathname.startsWith("/xr")) {
    return (
      <Suspense
        fallback={
          <div className="flex h-[100dvh] items-center justify-center bg-ink-950">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        }
      >
        <XRPage />
      </Suspense>
    );
  }

  // Gate the experience behind a frictionless, passwordless onboarding. While the
  // initial session restore runs, show only the backdrop so returning users are
  // auto-logged-in without flashing the landing.
  if (!account) {
    if (authLoading) return <DynamicBackground variant={bgVariant} />;
    return (
      <>
        <DynamicBackground variant={bgVariant} />
        <Onboarding />
      </>
    );
  }

  const routes = (
    <ErrorBoundary key={location.pathname}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page transition={pageTransition}><FeedsPage /></Page>} />
          <Route path="/local" element={<Page transition={pageTransition}><FeedsPage /></Page>} />
          <Route path="/trending" element={<Page transition={pageTransition}><FeedsPage /></Page>} />
          <Route path="/foryou" element={<Page transition={pageTransition}><ForYouPage /></Page>} />
          <Route path="/connect" element={<Page transition={pageTransition}><MatchmakingPage /></Page>} />
          <Route path="/spark" element={<Page transition={pageTransition}><SparkPage /></Page>} />
          <Route path="/rooms" element={<Page transition={pageTransition}><RoomsPage /></Page>} />
          <Route path="/profile" element={<Page transition={pageTransition}><ProfilePage /></Page>} />
          <Route
            path="/notifications"
            element={<Page transition={pageTransition}><NotificationsPage /></Page>}
          />
          <Route path="/admin" element={<Page transition={pageTransition}><AdminPage /></Page>} />
          <Route path="/u/:id" element={<Page transition={pageTransition}><UserProfilePage /></Page>} />
          <Route
            path="/live"
            element={
              <Page transition={pageTransition}>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-white/40">
                      Loading Live…
                    </div>
                  }
                >
                  <LivePage />
                </Suspense>
              </Page>
            }
          />
          <Route path="/play" element={<Navigate to="/live" replace />} />
          <Route path="/chat" element={<Page transition={pageTransition}><ChatHubPage /></Page>} />
          <Route path="/circles" element={<Navigate to="/chat" replace />} />
          <Route path="/circles/:id" element={<Page transition={pageTransition}><CircleChatPage /></Page>} />
          {/* Stale/removed paths (e.g. old /arena, /categories) → home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  );

  const overlays = (
    <>
      <ComposeSheet />
      <ConnectionSheet />
      <InboxSheet />
      <FriendChatSheet />
      <PostSheet />
      <MediaViewer />
      <PushPrompt />
      <LifelineSheet />
      <FeedbackSheet />
      <PremiumSheet />
      <AccountGate />
      <InstallPrompt />
      <Tutorial />
      <UploadIndicator />
      <Toast />
      <NotificationPopup />
      <Confetti />
      {!isOnline && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-[70] -translate-x-1/2 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-black shadow-card">
          Offline — you can still play; changes sync when you reconnect
        </div>
      )}
    </>
  );

  // Desktop / laptop: full-screen sidebar + content + context-rail shell.
  if (desktop) {
    return (
      <>
        <DynamicBackground variant={bgVariant} />
        {/* Darken the living backdrop on large displays so content/text stays
            legible (mobile gets this via its frosted column instead). */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-ink-950/60" />
        <div className="flex h-[100dvh] w-full overflow-hidden">
          <SideNav />
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className={cx("mx-auto h-full w-full px-6", desktopMax)}>
              {routes}
            </div>
          </main>
          <ContextRail />
        </div>
        {overlays}
      </>
    );
  }

  // Mobile / tablet: a phone-sized column centered over the living background.
  // Conversations widen to use landscape space.
  return (
    <>
      <DynamicBackground variant={bgVariant} />
      <div
        className={cx(
          "relative mx-auto flex h-[100dvh] flex-col overflow-hidden bg-ink-950/70 backdrop-blur-2xl transition-[max-width]",
          columnMax
        )}
      >
        <TopBar />
        <main className="relative flex-1 overflow-hidden">{routes}</main>
        <BottomNav />
        {overlays}
      </div>
    </>
  );
}
