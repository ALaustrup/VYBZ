import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, Sparkles, ScrollText, ShieldCheck, Shield, Bug, AudioLines,
  ChevronRight, MoreHorizontal, Radio, X,
} from "lucide-react";
import { PasskeysCard } from "@/components/PasskeysCard";
import { PasswordCard } from "@/components/PasswordCard";
import { requestOpenFeedback } from "@/features/alpha/AlphaWelcomeTour";
import { ArtistHome } from "@/components/home/ArtistHome";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { ProfileInbox } from "@/components/profile/ProfileInbox";
import { DashListenPanel } from "@/components/dashboard/DashListenPanel";
import { DashLivePanel } from "@/components/dashboard/DashLivePanel";
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
import { useResolvedCosmetics, Flair, CosmeticAvatarShell, accentWashStyle } from "@/lib/cosmetics";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { formatVc, formatVcAddress } from "@/lib/vc";
import type { Drop, Credit } from "@/types";

type DashTab = "hub" | "listen" | "live" | "you" | "wallet";
type YouSub = "music" | "live" | "lists";

/** Workspace — hidden from default chrome. Still at `/workspace`. */
export function ProfilePage() {
  const { profile, userId, refreshProfile } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "hub";
  const tab: DashTab =
    raw === "inbox" ? "you"
    : ["hub", "listen", "live", "you", "wallet"].includes(raw)
      ? (raw as DashTab)
      : "hub";
  const youSub: YouSub = (["music", "live", "lists"].includes(params.get("sub") ?? "")
    ? (params.get("sub") as YouSub)
    : "music");
  const [drops, setDrops] = useState<Drop[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goLive, setGoLive] = useState(false);

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
    Promise.all([api.dropsBy(userId, 20), api.creatorCredits(userId)]).then(([d, c]) => {
      setDrops(d); setCredits(c); setLoading(false);
    });
  }, [userId]);

  const addr = formatVcAddress(profile?.username);
  const vc = Number(profile?.modPoints ?? 0);

  useRegisterAppBar({
    hideYouChip: true,
    actions: (
      <button
        type="button"
        onClick={() => setGoLive(true)}
        data-testid="go-live"
        className="cta-pill flex h-9 items-center gap-1.5 bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))] px-4 text-xs font-semibold text-black shadow-glow"
      >
        <Radio className="h-3.5 w-3.5 animate-pulse" /> Go live
      </button>
    ),
  }, []);

  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  if (!profile) return null;
  const facets = profile.profile ?? {};

  return (
    <div
      className={cx(
        "min-h-0 flex-1 px-1 pb-[calc(var(--dock-reserve,4.75rem)+1.25rem)] pt-1",
        tab === "hub" ? "flex flex-col overflow-hidden" : "no-scrollbar overflow-y-auto",
      )}
      style={accentWashStyle(cosmetics.accent)}
      data-testid="profile-stage"
    >
      {tab === "hub" && <ArtistHome />}
      <GoLiveSheet open={goLive} onClose={() => setGoLive(false)} />
      {tab === "listen" && <DashListenPanel />}
      {tab === "live" && <DashLivePanel />}
      {tab === "wallet" && <WalletPage embedded />}
      {tab === "you" && (
        <>
          <div className="mb-4 flex items-start gap-3">
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
              <p className="mt-1.5 font-mono text-[13px] text-cyan-200/90">{addr || "Set username"}</p>
              <p className="mt-1 text-[12px] text-white/40">{formatVc(vc)} Vc</p>
            </div>
          </div>

          <div className="forge-card mb-4 flex gap-1 !p-1">
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

          {youSub === "music" && (
            <>
              <div className="mb-4">
                <Discography credits={credits} isOwner />
              </div>
              <div className="mb-2">
                <p className="nexus-eyebrow flex items-center gap-1.5"><AudioLines className="h-3.5 w-3.5" /> Your uploads</p>
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
              <DashLivePanel />
            </div>
          )}

          {youSub === "lists" && (
            <div className="mb-4 space-y-4">
              <DashListsPanel />
              <div>
                <p className="nexus-eyebrow mb-2">Projects</p>
                <ProjectsPanel userId={userId!} editable />
              </div>
              <div>
                <p className="nexus-eyebrow mb-2">Inbox</p>
                <ProfileInbox />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="forge-card mb-2 flex w-full items-center gap-3 text-left text-[13px] text-white/55 hover:text-white/80"
          >
            <MoreHorizontal className="h-4 w-4" /> Settings & tools
            <ChevronRight className="ml-auto h-4 w-4 text-white/30" />
          </button>
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
              className="forge-glass-edge relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl"
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
                <PasswordCard />
                <div className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
                  <LinkRow icon={Sparkles} title="Looks" body="Accent, flair, frame, backdrop" onClick={() => { setSettingsOpen(false); navigate("/store"); }} />
                  <LinkRow icon={ScrollText} title="Docs & legal" body="Terms, privacy, contracts" onClick={() => { setSettingsOpen(false); navigate("/codex"); }} />
                  {(profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin) && (
                    <LinkRow icon={Shield} title="Moderate" body="Report queue" onClick={() => { setSettingsOpen(false); navigate("/mod"); }} />
                  )}
                  {profile.platformRole === "member" && !profile.isAdmin && (
                    <LinkRow icon={Shield} title="Become a moderator" body="Help keep the place clean" onClick={() => { setSettingsOpen(false); navigate("/apply-mod"); }} />
                  )}
                  {profile.isAdmin && (
                    <LinkRow icon={ShieldCheck} title="Admin" body="Members" onClick={() => { setSettingsOpen(false); navigate("/admin"); }} />
                  )}
                  <LinkRow
                    icon={Bug}
                    title="Report a bug"
                    body="Goes to the team"
                    onClick={() => {
                      setSettingsOpen(false);
                      requestOpenFeedback();
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <p className="nexus-eyebrow mb-2">Visual effects</p>
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
      <p className="nexus-eyebrow mb-2">Reactive intensity</p>
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
