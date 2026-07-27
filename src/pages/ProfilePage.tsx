import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, LogOut, Pencil, Sparkles, Star, Target, Users, ScrollText,
  ShieldCheck, Shield, Bug, AudioLines, ChevronRight, Images, MoreHorizontal, X,
  Bell, Inbox,
} from "lucide-react";
import { ReportBugModal } from "@/components/ReportBugModal";
import { PasskeysCard } from "@/components/PasskeysCard";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";
import { ProfileInbox } from "@/components/profile/ProfileInbox";
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
import type { Drop, CreatorStats, Credit } from "@/types";

type DashTab = "live" | "inbox" | "you";

export function ProfilePage() {
  const { profile, userId, signOut, refreshProfile, unread } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (["live", "inbox", "you"].includes(params.get("tab") ?? "")
    ? (params.get("tab") as DashTab)
    : "live");
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
      return p;
    }, { replace: true });
  }

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.rolesFor(userId), api.dropsBy(userId, 20), api.getCreatorStats(userId), api.creatorCredits(userId)]).then(([r, d, s, c]) => {
      setRoles(r); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [userId]);

  useRegisterAppBar({
    title: profile?.username ? `@${profile.username}` : "Dashboard",
    subtitle: tab === "live" ? "Live feed" : tab === "inbox" ? "Inbox" : (profile?.profile?.roleLabel || "You"),
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
  }, [profile?.username, profile?.profile?.roleLabel, signOut, navigate, settingsOpen, tab]);

  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  if (!profile) return null;
  const facets = profile.profile ?? {};

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
          <p className="mt-1.5 text-[12px] text-white/45">Your private VYBZ dashboard</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {([
          { id: "live" as const, label: "Live", icon: Bell, badge: unread },
          { id: "inbox" as const, label: "Inbox", icon: Inbox },
          { id: "you" as const, label: "You", icon: Users },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition",
              tab === t.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {"badge" in t && typeof t.badge === "number" && t.badge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-veil-400 px-1 text-[9px] font-bold text-ink-950">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "live" && <ProfileLiveFeed />}
      {tab === "inbox" && <ProfileInbox />}
      {tab === "you" && (
        <>
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
              <p className="text-[13px] text-white/55">Add roles you bring and seek for better matches.</p>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/30" />
            </button>
          )}

          {stats && (
            <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/40">
              {stats.reputation >= 0.5 && <span className="flex items-center gap-1 text-white/60"><Star className="h-3 w-3" /> Proven</span>}
              <span>{stats.drops} drops</span>
              {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.connections}</span>}
            </p>
          )}

          <div className="mb-4">
            <Discography credits={credits} isOwner />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow flex items-center gap-1.5"><AudioLines className="h-3.5 w-3.5" /> Drops</p>
            <button
              type="button"
              onClick={() => navigate("/library")}
              className="flex items-center gap-1 text-[12px] font-semibold text-veil-200/80 hover:text-white active:scale-95"
            >
              <Images className="h-3.5 w-3.5" /> Library
            </button>
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

          <div className="mb-4">
            <p className="eyebrow mb-2">Projects</p>
            <ProjectsPanel userId={userId!} editable />
          </div>
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
                  <LinkRow icon={ScrollText} title="Codex & Legal" body="Contracts, Terms, Privacy" onClick={() => { setSettingsOpen(false); navigate("/codex"); }} />
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
          Opt-in email with your top Network fits (Mondays). Same ranking as Connect — never required.
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
