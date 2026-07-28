import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, LogOut, Pencil, Sparkles, Star, Target, Users, ScrollText,
  ShieldCheck, Shield, Bug, AudioLines, ChevronRight, MoreHorizontal, X,
  Radio, Wallet, Heart, Headphones, Copy,
} from "lucide-react";
import { ReportBugModal } from "@/components/ReportBugModal";
import { PasskeysCard } from "@/components/PasskeysCard";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { ProfileInbox } from "@/components/profile/ProfileInbox";
import { DashHubPanel } from "@/components/dashboard/DashHubPanel";
import { DashListenPanel } from "@/components/dashboard/DashListenPanel";
import { DashLivePanel } from "@/components/dashboard/DashLivePanel";
import { DashConnectPanel } from "@/components/dashboard/DashConnectPanel";
import { DashListsPanel } from "@/components/dashboard/DashListsPanel";
import { WalletPage } from "@/pages/WalletPage";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { UploadsLibrary } from "@/components/UploadsLibrary";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { PayoutSetup } from "@/components/PayoutSetup";
import { Discography } from "@/components/Discography";
import { AffiliateLinks } from "@/components/AffiliateLinks";
import { ArtistRoster } from "@/components/ArtistRoster";
import { ProBadge } from "@/components/ProBadge";
import { FLAGS } from "@/lib/flags";
import { swarmSeedOptIn, setSwarmSeedOptIn } from "@/lib/swarm";
import { cx } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { useReduceFxOverride, setReduceFx, useReduceFx, useFxIntensity, setFxIntensity } from "@/lib/display";
import { useResolvedCosmetics, Flair, CosmeticAvatarShell } from "@/lib/cosmetics";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { formatVc, formatVcAddress, vcToUsd } from "@/lib/vc";
import type { Drop, CreatorStats, Credit } from "@/types";

type DashTab = "hub" | "listen" | "live" | "connect" | "you" | "wallet";
type YouSub = "music" | "live" | "lists";

const TABS: { id: DashTab; label: string; icon: typeof Heart }[] = [
  { id: "hub", label: "Hub", icon: Sparkles },
  { id: "listen", label: "Listen", icon: Headphones },
  { id: "live", label: "Live", icon: Radio },
  { id: "connect", label: "Connect", icon: Heart },
  { id: "you", label: "You", icon: Users },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

/** Primary logged-in surface — Music Hub (SoundCloud × Spotify × Twitch). */
export function ProfilePage() {
  const { profile, userId, signOut, refreshProfile, showToast, unread } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "hub";
  const tab: DashTab =
    raw === "inbox" || raw === "match" ? (raw === "match" ? "connect" : "you")
    : ["hub", "listen", "live", "connect", "you", "wallet"].includes(raw)
      ? (raw as DashTab)
      : "hub";
  const youSub: YouSub = (["music", "live", "lists"].includes(params.get("sub") ?? "")
    ? (params.get("sub") as YouSub)
    : "music");
  const [roles, setRoles] = useState<{ offers: string[]; seeks: string[] }>({ offers: [], seeks: [] });
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [bugOpen, setBugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function setTab(next: DashTab) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      if (next !== "you") p.delete("sub");
      return p;
    }, { replace: true });
  }

  function setYouSub(next: YouSub) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "you");
      p.set("sub", next);
      return p;
    }, { replace: true });
  }

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.rolesFor(userId), api.dropsBy(userId, 20), api.getCreatorStats(userId), api.creatorCredits(userId)]).then(([r, d, s, c]) => {
      setRoles(r); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [userId]);

  const addr = formatVcAddress(profile?.username);
  const vc = Number(profile?.modPoints ?? 0);

  useRegisterAppBar({
    title: addr || "VYBZ",
    subtitle:
      tab === "hub" ? "Music hub"
      : tab === "listen" ? "Discover & earn"
      : tab === "live" ? "Live & tips"
      : tab === "connect" ? "Connection Lab"
      : tab === "wallet" ? `${formatVc(vc)} Vc`
      : (profile?.profile?.roleLabel || "Your stage"),
    actions: (
      <>
        <button type="button" onClick={() => navigate("/profile/edit")} aria-label="Edit"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings & tools" aria-expanded={settingsOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={signOut} aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <LogOut className="h-4 w-4" />
        </button>
      </>
    ),
  }, [addr, profile?.profile?.roleLabel, signOut, navigate, settingsOpen, tab, vc]);

  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  if (!profile) return null;
  const facets = profile.profile ?? {};

  async function copyAddr() {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      showToast("Address copied");
    } catch {
      showToast(addr);
    }
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-4 pt-1.5">
      <div className="mb-3 flex items-start gap-3">
        <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
          <Avatar url={profile.avatarUrl} name={profile.username} id={profile.id} size="lg" square />
        </CosmeticAvatarShell>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Flair data={cosmetics.flair} />
            <ProfessionBadges primary={facets.profession} all={facets.professions} />
            <RoleClassBadge roleClass={facets.roleClass} />
            <ProBadge profile={facets} />
          </div>
          <button
            type="button"
            onClick={() => void copyAddr()}
            className="mt-1.5 flex items-center gap-1.5 font-mono text-[13px] text-cyan-200/90 active:scale-95"
          >
            {addr || "Set username"}
            {addr && <Copy className="h-3 w-3 text-white/35" />}
          </button>
          <p className="mt-1 text-[12px] text-white/40">
            {formatVc(vc)} Vc · ≈ ${vcToUsd(vc).toFixed(2)} · SoundCloud × Spotify × Twitch
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold transition sm:flex-row sm:gap-1.5 sm:text-[12px]",
              tab === t.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t.label}</span>
            {t.id === "live" && unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-veil-400 px-1 text-[9px] font-bold text-ink-950">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "hub" && (
        <DashHubPanel
          onListenMore={() => setTab("listen")}
          onLiveMore={() => setTab("live")}
        />
      )}
      {tab === "listen" && <DashListenPanel />}
      {tab === "live" && <DashLivePanel />}
      {tab === "connect" && <DashConnectPanel />}
      {tab === "wallet" && <WalletPage embedded />}
      {tab === "you" && (
        <>
          <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {([
              { id: "music" as const, label: "Music" },
              { id: "live" as const, label: "Live" },
              { id: "lists" as const, label: "Lists" },
            ]).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setYouSub(s.id)}
                className={cx(
                  "flex-1 rounded-xl py-2 text-[12px] font-semibold transition",
                  youSub === s.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {profile.bio && <p className="mb-3 text-sm leading-relaxed text-white/60">{profile.bio}</p>}

          {(roles.offers.length > 0 || roles.seeks.length > 0 || facets.genres?.length) && (
            <div className="mb-4 space-y-1 text-[13px] text-white/55">
              {roles.offers.length > 0 && <p><span className="text-[11px] uppercase tracking-wider text-white/35">I bring </span>{roles.offers.join(" · ")}</p>}
              {roles.seeks.length > 0 && <p><span className="text-[11px] uppercase tracking-wider text-white/35">Seeking </span>{roles.seeks.join(" · ")}</p>}
              {facets.genres?.length ? <p><span className="text-[11px] uppercase tracking-wider text-white/35">Genres </span>{facets.genres.join(" · ")}</p> : null}
            </div>
          )}

          {(roles.offers.length === 0 && roles.seeks.length === 0) && (
            <button type="button" onClick={() => navigate("/profile/edit")} className="mb-4 flex w-full items-center gap-3 border-y border-[var(--hairline)] py-2.5 text-left">
              <Target className="h-4 w-4 shrink-0 text-veil-300" />
              <p className="text-[13px] text-white/55">Add genres and roles so discovery and Connection Lab get sharper.</p>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/30" />
            </button>
          )}

          {stats && (
            <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/40">
              {stats.reputation >= 0.5 && <span className="flex items-center gap-1 text-white/60"><Star className="h-3 w-3" /> Proven</span>}
              <span>{stats.drops} tracks</span>
              {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.connections}</span>}
            </p>
          )}

          {youSub === "music" && (
            <>
              <div className="mb-4">
                <Discography credits={credits} isOwner />
              </div>
              <div className="mb-2">
                <p className="eyebrow flex items-center gap-1.5"><AudioLines className="h-3.5 w-3.5" /> Your uploads</p>
              </div>
              {loading ? (
                <div className="mb-4 flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
              ) : (
                <div className="mb-4">
                  <UploadsLibrary initialDrops={drops} featuredId={profile.featuredDropId} onFeaturedChange={refreshProfile} />
                </div>
              )}
              <div className="mb-4">
                <ArtistRoster userId={userId!} editable drops={drops} />
              </div>
            </>
          )}

          {youSub === "live" && (
            <div className="mb-4">
              <p className="mb-2 text-[13px] text-white/45">
                When you go live, fans see it on your public profile and the Hub. Tip goals and chat live on the stream page.
              </p>
              <DashLivePanel />
            </div>
          )}

          {youSub === "lists" && (
            <div className="mb-4 space-y-4">
              <DashListsPanel />
              <div>
                <p className="eyebrow mb-2">Projects</p>
                <ProjectsPanel userId={userId!} editable />
              </div>
              <div>
                <p className="eyebrow mb-2">Inbox</p>
                <ProfileInbox />
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Settings & tools"
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl sm:rounded-3xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
                <p className="text-[13px] font-semibold text-white/90">Settings & tools</p>
                <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full glass active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="no-scrollbar space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <DisplaySetting />
                <PayoutSetup />
                {userId && <AffiliateLinks userId={userId} editable />}
                <DigestOptIn />
                {FLAGS.swarm && (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" className="mt-0.5 accent-[var(--veil-400)]" defaultChecked={swarmSeedOptIn()} onChange={(e) => setSwarmSeedOptIn(e.target.checked)} />
                    <span>
                      <span className="block text-[13px] font-medium text-white/85">Seed stems over Swarm</span>
                      <span className="mt-0.5 block text-[11px] text-white/40">Opt-in P2P for encrypted audio chunks.</span>
                    </span>
                  </label>
                )}
                <PasskeysCard />
                <div className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
                  <LinkRow icon={Sparkles} title="Flair" body="Profile Enhancement — looks only" onClick={() => { setSettingsOpen(false); navigate("/store"); }} />
                  <LinkRow icon={ScrollText} title="Codex & Legal" body="Contracts, Terms, Privacy, Vc" onClick={() => { setSettingsOpen(false); navigate("/codex"); }} />
                  {(profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin) && (
                    <LinkRow icon={Shield} title="Moderate" body="Report queue" onClick={() => { setSettingsOpen(false); navigate("/mod"); }} />
                  )}
                  {profile.platformRole === "member" && !profile.isAdmin && (
                    <LinkRow icon={Shield} title="Become a moderator" body="Help keep VYBZ real" onClick={() => { setSettingsOpen(false); navigate("/apply-mod"); }} />
                  )}
                  {profile.isAdmin && (
                    <LinkRow icon={ShieldCheck} title="Admin" body="Members & matchmaking" onClick={() => { setSettingsOpen(false); navigate("/admin"); }} />
                  )}
                  <LinkRow icon={Bug} title="Report a bug" body="Goes to the team" onClick={() => { setSettingsOpen(false); setBugOpen(true); }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportBugModal open={bugOpen} onClose={() => setBugOpen(false)} />
    </div>
  );
}

function DigestOptIn() {
  const { showToast } = useSession();
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void api.getDigestOptIn().then((v) => {
      if (!alive) return;
      setOn(v);
      setReady(true);
    }).catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      setOn(await api.setDigestOptIn(next));
      showToast(next ? "Weekly digest on — Mondays via email." : "Weekly digest off.");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 accent-[var(--veil-400)]"
        checked={on}
        disabled={busy}
        onChange={(e) => void toggle(e.target.checked)}
      />
      <span>
        <span className="block text-[13px] font-medium text-white/85">Weekly match digest</span>
        <span className="mt-0.5 block text-[11px] text-white/40">
          Opt-in email with your top taste fits (Mondays).
        </span>
      </span>
    </label>
  );
}

function LinkRow({ icon: Icon, title, body, onClick }: { icon: typeof Bug; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-white/[0.02]">
      <Icon className="h-4 w-4 shrink-0 text-white/40" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-[11px] text-white/40">{body}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
    </button>
  );
}

function DisplaySetting() {
  const override = useReduceFxOverride();
  const current = override === null ? "auto" : override ? "reduced" : "full";
  const opts: { id: string; label: string; val: boolean | null }[] = [
    { id: "auto", label: "Auto", val: null },
    { id: "full", label: "Full", val: false },
    { id: "reduced", label: "Reduced", val: true },
  ];
  return (
    <div>
      <p className="eyebrow mb-2">Visual effects</p>
      <div className="flex gap-5">
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => setReduceFx(o.val)}
            className={cx("relative pb-2 text-[13px] font-medium transition", current === o.id ? "text-white" : "text-white/35 hover:text-white/70")}>
            {o.label}
            {current === o.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
      <IntensitySetting />
    </div>
  );
}

function IntensitySetting() {
  const reduced = useReduceFx();
  const intensity = useFxIntensity();
  if (reduced) {
    return (
      <p className="mt-3 text-[11px] text-white/40">
        Reactive Orb is off while visual effects are Reduced (or OS reduce-motion).
      </p>
    );
  }
  return (
    <div className="mt-3">
      <p className="eyebrow mb-2">Reactive intensity</p>
      <div className="flex flex-wrap gap-5">
        {([
          { id: "off" as const, label: "Off" },
          { id: "soft" as const, label: "Soft" },
          { id: "max" as const, label: "VYBZ Max" },
        ]).map((o) => (
          <button key={o.id} type="button" onClick={() => setFxIntensity(o.id)}
            className={cx("relative pb-2 text-[13px] font-medium transition", intensity === o.id ? "text-white" : "text-white/35 hover:text-white/70")}>
            {o.label}
            {intensity === o.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/40">
        Off pauses Orb audio morph. Soft is gentle. VYBZ Max is vivid color + full edge reactivity.
      </p>
    </div>
  );
}
