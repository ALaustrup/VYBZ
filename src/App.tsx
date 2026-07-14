import { useState } from "react";
import { motion } from "framer-motion";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { Loader2, AudioLines, Users, MessageSquare, User, Plus, Search, Bell, FolderGit2, ShieldCheck } from "lucide-react";
import { useSession } from "@/store/session";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { DynamicBackground } from "@/components/DynamicBackground";
import { Onboarding, UsernameSetup } from "@/components/Onboarding";
import { RoleIntentOnboarding } from "@/components/RoleIntentOnboarding";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { ComposeSheet } from "@/components/ComposeSheet";
import { GlobalPlayer } from "@/components/GlobalPlayer";
import { ReactiveFrame } from "@/components/ReactiveFrame";
import { Toast } from "@/components/Toast";
import { Confetti } from "@/components/Confetti";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandLockup } from "@/components/Brand";
import { FeedPage } from "@/pages/FeedPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { SparkPage } from "@/pages/SparkPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { ProjectPage } from "@/pages/ProjectPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectRoomPage } from "@/pages/ProjectRoomPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { RoomPage } from "@/pages/RoomPage";
import { CodexPage } from "@/pages/CodexPage";
import { CodexDocPage } from "@/pages/CodexDocPage";
import { AdminPage } from "@/pages/AdminPage";
import { cx } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Drops", icon: AudioLines, end: true },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/connect", label: "Connect", icon: Users, match: ["/spark", "/opportunities"] },
  { to: "/projects", label: "Studio", icon: FolderGit2 },
  { to: "/messages", label: "Messages", icon: MessageSquare, match: ["/rooms"] },
  { to: "/profile", label: "You", icon: User, match: ["/u/"] },
];

export function App() {
  const { ready, userId, profile, backendEnabled } = useSession();
  const [feedKey, setFeedKey] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const location = useLocation();

  // Post-signup onboarding: ask role + intent until the creator has a role.
  const [onboarded, setOnboarded] = useState(false);
  const authed = !!userId && !!profile?.username;
  const hasRole = !!(profile?.profile?.role || profile?.profile?.roleLabel);

  if (!backendEnabled) {
    return <div className="flex min-h-[100dvh] items-center justify-center px-8 text-center text-white/60">VYBZ backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>;
  }
  if (!ready) return <><DynamicBackground variant="default" /><div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div></>;

  // The Codex + platform legal pages are PUBLIC (no sign-in) — a free resource + SEO.
  const isPublicDoc = location.pathname.startsWith("/codex") || location.pathname.startsWith("/legal");
  if (!userId || !profile?.username) {
    if (isPublicDoc) return <PublicDocShell />;
    if (!userId) return <><DynamicBackground variant="default" /><Onboarding /></>;
    return <><DynamicBackground variant="default" /><UsernameSetup /></>;
  }

  // New creator without a role yet → the streamlined role + intent onboarding.
  if (!isPublicDoc && authed && !hasRole && !onboarded) {
    return (
      <>
        <DynamicBackground variant="default" />
        <RoleIntentOnboarding onComplete={() => setOnboarded(true)} />
      </>
    );
  }

  const routes = (
    <ErrorBoundary key={location.pathname}>
      <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: "easeOut" }} className="h-full">
      <Routes location={location}>
        <Route path="/" element={<FeedPage key={feedKey} onCompose={() => setComposeOpen(true)} />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/activity" element={<NotificationsPage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/spark" element={<SparkPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectRoomPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<MessagesPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:id" element={<RoomPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/u/:id" element={<UserProfilePage />} />
        <Route path="/p/:id" element={<ProjectPage />} />
        <Route path="/codex" element={<CodexPage />} />
        <Route path="/codex/:slug" element={<CodexDocPage />} />
        <Route path="/legal/:slug" element={<CodexDocPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </motion.div>
    </ErrorBoundary>
  );

  const overlays = (
    <>
      <ComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
      <ReactiveFrame />
      <WelcomeTutorial />
      <Toast /><Confetti />
    </>
  );

  if (desktop) {
    return (
      <>
        <DynamicBackground variant="default" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-ink-950/60" />
        <div className="flex h-[100dvh] w-full overflow-hidden">
          <aside className="glass z-40 flex h-full w-60 shrink-0 flex-col border-r border-white/10 px-3 py-5">
            <div className="mb-5 px-3"><BrandLockup height="h-8" /></div>
            <button onClick={() => setComposeOpen(true)} className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3 font-display text-sm font-semibold text-white shadow-glow active:scale-[0.98]"><Plus className="h-5 w-5" /> New drop</button>
            <SideNav />
          </aside>
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-hidden px-6">{routes}</div>
            <GlobalPlayer className="relative z-10 pb-3" />
          </main>
        </div>
        {overlays}
      </>
    );
  }

  return (
    <>
      <DynamicBackground variant="default" />
      <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-ink-950/70 backdrop-blur-2xl">
        <MobileBell />
        <main className="relative z-10 flex-1 overflow-hidden pt-[env(safe-area-inset-top)]">{routes}</main>
        <GlobalPlayer />
        <BottomNav />
      </div>
      {overlays}
    </>
  );
}

/** Minimal public layout for the Codex + legal pages (no sign-in required). */
function PublicDocShell() {
  const location = useLocation();
  return (
    <>
      <DynamicBackground variant="default" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ink-950/60" />
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="glass z-40 flex shrink-0 items-center gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/codex"><BrandLockup height="h-7" /></NavLink>
          <span className="ml-auto hidden text-xs text-white/45 sm:block">Codex · Astra Matrix, Inc.</span>
          <NavLink to="/" className="rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 active:scale-95">Enter VYBZ</NavLink>
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

function SideNav() {
  const { pathname } = useLocation();
  const { unread, profile } = useSession();
  const item = (to: string, label: string, Icon: typeof Bell, active: boolean, badge?: number) => (
    <NavLink key={to} to={to} className={cx("nav-item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold", active ? "text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/90")}>
      {active && <motion.span layoutId="sidenav-active" transition={{ type: "spring", stiffness: 400, damping: 32 }} className="absolute inset-0 rounded-xl bg-veil-500/15 ring-1 ring-veil-400/40" />}
      <span className="relative z-10"><Icon className={cx("h-5 w-5", active && "nav-icon-active text-veil-200")} />{badge ? <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">{badge > 9 ? "9+" : badge}</span> : null}</span>
      <span className="relative z-10">{label}</span>
    </NavLink>
  );
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end, match }) => {
        const active = (end ? pathname === to : pathname.startsWith(to)) || (match ?? []).some((m) => pathname.startsWith(m));
        return item(to, label, Icon, active);
      })}
      {item("/activity", "Activity", Bell, pathname === "/activity", unread)}
      {profile?.isAdmin && item("/admin", "Admin", ShieldCheck, pathname.startsWith("/admin"))}
    </nav>
  );
}

function MobileBell() {
  const { unread } = useSession();
  const { pathname } = useLocation();
  if (pathname === "/activity") return null;
  return (
    <NavLink to="/activity" aria-label="Activity"
      className={cx("absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90", unread > 0 && "bell-alert")}>
      <Bell className="h-4 w-4 text-white/75" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </NavLink>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="relative z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="glass mx-auto flex h-[68px] max-w-md items-center justify-around rounded-2xl border border-white/10 px-1.5">
        {NAV.map(({ to, label, icon: Icon, end, match }) => {
          const active = (end ? pathname === to : pathname.startsWith(to)) || (match ?? []).some((m) => pathname.startsWith(m));
          return (
            <NavLink key={to} to={to} aria-label={label} className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5">
              {active && <motion.span layoutId="bottomnav-active" transition={{ type: "spring", stiffness: 400, damping: 32 }} className="absolute inset-0 rounded-xl bg-white/[0.05]" />}
              <Icon className={cx("relative z-10 h-[22px] w-[22px] transition", active ? "text-veil-200 nav-icon-active" : "text-white/45")} />
              <span className={cx("relative z-10 text-[11px] font-semibold", active ? "text-white/90" : "text-white/50")}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
