import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, LogOut, Pencil, Sparkles, Star, Target, Users, ScrollText,
  ShieldCheck, Shield, Bug, AudioLines, ChevronRight, ChevronDown,
} from "lucide-react";
import { ReportBugModal } from "@/components/ReportBugModal";
import { PasskeysCard } from "@/components/PasskeysCard";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
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
import { useResolvedCosmetics, Flair } from "@/lib/cosmetics";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import type { Drop, CreatorStats, Credit } from "@/types";

export function ProfilePage() {
  const { profile, userId, signOut, refreshProfile } = useSession();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<{ offers: string[]; seeks: string[] }>({ offers: [], seeks: [] });
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [bugOpen, setBugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.rolesFor(userId), api.dropsBy(userId, 20), api.getCreatorStats(userId), api.creatorCredits(userId)]).then(([r, d, s, c]) => {
      setRoles(r); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [userId]);

  useRegisterAppBar({
    title: profile?.username ? `@${profile.username}` : "You",
    subtitle: profile?.profile?.roleLabel || undefined,
    actions: (
      <>
        <button type="button" onClick={() => navigate("/profile/edit")} aria-label="Edit"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={signOut} aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <LogOut className="h-4 w-4" />
        </button>
      </>
    ),
  }, [profile?.username, profile?.profile?.roleLabel, signOut, navigate]);

  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  if (!profile) return null;
  const facets = profile.profile ?? {};

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-6 pt-2">
      <div className="mb-4 flex items-start gap-4">
        <Avatar url={profile.avatarUrl} name={profile.username} id={profile.id} size="lg" square />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-[1.65rem] font-semibold tracking-tight text-white">{profile.username}</h1>
            <Flair data={cosmetics.flair} />
          </div>
          {facets.roleLabel && <p className="truncate text-sm text-white/55">{facets.roleLabel}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProfessionBadges primary={facets.profession} all={facets.professions} />
            <RoleClassBadge roleClass={facets.roleClass} />
            <ProBadge profile={facets} />
          </div>
          {stats && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/40">
              {stats.reputation >= 0.5 && <span className="flex items-center gap-1 text-white/60"><Star className="h-3 w-3" /> Proven</span>}
              <span>{stats.drops} drops</span>
              {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.connections}</span>}
            </p>
          )}
        </div>
      </div>

      {profile.bio && <p className="mb-4 text-sm leading-relaxed text-white/60">{profile.bio}</p>}

      {(roles.offers.length > 0 || roles.seeks.length > 0 || facets.genres?.length) && (
        <div className="mb-5 space-y-1.5 text-[13px] text-white/55">
          {roles.offers.length > 0 && <p><span className="text-[11px] uppercase tracking-wider text-white/35">I bring </span>{roles.offers.join(" · ")}</p>}
          {roles.seeks.length > 0 && <p><span className="text-[11px] uppercase tracking-wider text-white/35">Seeking </span>{roles.seeks.join(" · ")}</p>}
          {facets.genres?.length ? <p><span className="text-[11px] uppercase tracking-wider text-white/35">Genres </span>{facets.genres.join(" · ")}</p> : null}
        </div>
      )}

      {(roles.offers.length === 0 && roles.seeks.length === 0) && (
        <button type="button" onClick={() => navigate("/profile/edit")} className="mb-5 flex w-full items-center gap-3 border-y border-[var(--hairline)] py-3 text-left">
          <Target className="h-4 w-4 shrink-0 text-veil-300" />
          <p className="text-[13px] text-white/55">Add roles you bring and seek for better matches.</p>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/30" />
        </button>
      )}

      <div className="mb-5">
        <Discography credits={credits} isOwner />
      </div>

      <p className="eyebrow mb-3 flex items-center gap-1.5"><AudioLines className="h-3.5 w-3.5" /> Drops</p>
      {loading ? (
        <div className="mb-6 flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : (
        <div className="mb-6">
          <UploadsLibrary initialDrops={drops} featuredId={profile.featuredDropId} onFeaturedChange={refreshProfile} />
        </div>
      )}

      <div className="mb-5">
        <ArtistRoster userId={userId!} editable drops={drops} />
      </div>

      <div className="mb-5">
        <p className="eyebrow mb-3">Studio</p>
        <ProjectsPanel userId={userId!} editable />
      </div>

      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-white/80">Settings & tools</span>
        <ChevronDown className={cx("h-4 w-4 text-white/40 transition", settingsOpen && "rotate-180")} />
      </button>

      {settingsOpen && (
        <div className="mb-4 space-y-4 rounded-2xl border border-white/8 bg-ink-950/40 p-4">
          <DisplaySetting />
          <PayoutSetup />
          {userId && <AffiliateLinks userId={userId} editable />}
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
            <LinkRow icon={Sparkles} title="Cosmetic store" body="Accents & flair" onClick={() => navigate("/store")} />
            <LinkRow icon={ScrollText} title="Codex & Legal" body="Contracts, Terms, Privacy" onClick={() => navigate("/codex")} />
            {(profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin) && (
              <LinkRow icon={Shield} title="Moderate" body="Report queue" onClick={() => navigate("/mod")} />
            )}
            {profile.platformRole === "member" && !profile.isAdmin && (
              <LinkRow icon={Shield} title="Become a moderator" body="Help keep VYBZ real" onClick={() => navigate("/apply-mod")} />
            )}
            {profile.isAdmin && (
              <LinkRow icon={ShieldCheck} title="Admin" body="Members & matchmaking" onClick={() => navigate("/admin")} />
            )}
            <LinkRow icon={Bug} title="Report a bug" body="Goes to the team" onClick={() => setBugOpen(true)} />
          </div>
        </div>
      )}

      <ReportBugModal open={bugOpen} onClose={() => setBugOpen(false)} />
    </div>
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
  if (reduced) return null;
  return (
    <div className="mt-3">
      <p className="eyebrow mb-2">Reactive intensity</p>
      <div className="flex gap-5">
        {([{ id: "subtle" as const, label: "Subtle" }, { id: "full" as const, label: "Full" }]).map((o) => (
          <button key={o.id} type="button" onClick={() => setFxIntensity(o.id)}
            className={cx("relative pb-2 text-[13px] font-medium transition", intensity === o.id ? "text-white" : "text-white/35 hover:text-white/70")}>
            {o.label}
            {intensity === o.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
    </div>
  );
}
