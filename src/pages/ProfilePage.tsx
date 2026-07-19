import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, LogOut, Pencil, Sparkles, Star, Target, Users, BadgeCheck, ScrollText,
  ShieldCheck, Shield, Bug, AudioLines, ChevronRight,
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
import { cx } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { useReduceFxOverride, setReduceFx, useReduceFx, useFxIntensity, setFxIntensity } from "@/lib/display";
import { useResolvedCosmetics, Flair } from "@/lib/cosmetics";
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

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.rolesFor(userId), api.dropsBy(userId, 20), api.getCreatorStats(userId), api.creatorCredits(userId)]).then(([r, d, s, c]) => {
      setRoles(r); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [userId]);

  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  if (!profile) return null;
  const facets = profile.profile ?? {};

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-8 pt-4 max-lg:pr-14">
      <div className="mb-5 flex items-start gap-4">
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
          </div>
          {profile.location && <p className="mt-1 text-sm text-white/40">{profile.location}</p>}
        </div>
        <div className="flex shrink-0 gap-1.5 pt-1">
          <button type="button" onClick={() => navigate("/profile/edit")} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={signOut} aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mb-5 h-px w-full bg-[var(--hairline)]" />

      {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
          {stats.reputation >= 0.5 && <span className="flex items-center gap-1 font-medium text-white/65"><Star className="h-3 w-3" /> Proven</span>}
          {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-white/50" />{stats.avgRating.toFixed(1)} · {stats.ratings}</span>}
          <span>{stats.drops} {stats.drops === 1 ? "drop" : "drops"}</span>
          {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.connections}</span>}
        </div>
      )}
      {profile.bio && <p className="mb-5 text-sm leading-relaxed text-white/65">{profile.bio}</p>}

      <div className="mb-5 space-y-2">
        {roles.offers.length > 0 && <FacetRow icon={<Sparkles className="h-3.5 w-3.5 text-white/35" />} label="I bring" items={roles.offers} />}
        {roles.seeks.length > 0 && <FacetRow icon={<Target className="h-3.5 w-3.5 text-white/35" />} label="Looking for" items={roles.seeks} />}
        {facets.genres?.length ? <FacetRow label="Genres" items={facets.genres} /> : null}
        {facets.daws?.length ? <FacetRow label="DAWs" items={facets.daws} /> : null}
      </div>

      <PayoutSetup />

      {(roles.offers.length === 0 && roles.seeks.length === 0) && (
        <button type="button" onClick={() => navigate("/profile/edit")} className="mb-5 flex w-full items-center gap-3 border-y border-[var(--hairline)] py-3.5 text-left">
          <Target className="h-4 w-4 shrink-0 text-veil-300" />
          <p className="text-[13px] text-white/55">Add roles you <span className="text-white/85">bring</span> and <span className="text-white/85">seek</span> — that powers precise matches.</p>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/30" />
        </button>
      )}

      {credits.length > 0 && (
        <div className="mb-5">
          <p className="eyebrow mb-3">Verified credits</p>
          <div className="divide-y divide-[var(--hairline)]">
            {credits.map((c) => (
              <div key={c.projectId} className="flex items-center gap-2 py-2.5">
                <BadgeCheck className="h-4 w-4 shrink-0 text-feel" />
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.title}</span>
                {c.role && <span className="shrink-0 text-[11px] text-white/40">{c.role}</span>}
                {c.split != null && <span className="shrink-0 text-[11px] font-medium text-white/55">{c.split}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="eyebrow mb-3">Projects</p>
        <ProjectsPanel userId={userId!} editable />
      </div>

      <DisplaySetting />

      <PasskeysCard />

      <div className="mb-6 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
        <LinkRow icon={Sparkles} title="Cosmetic store" body={`Profile accents & flair${profile.modPoints > 0 ? ` · ${profile.modPoints} credits` : ""}`} onClick={() => navigate("/store")} />
        <LinkRow icon={ScrollText} title="VYBZ Codex & Legal" body="Contracts, licenses, Terms, Privacy, DMCA" onClick={() => navigate("/codex")} />
        {(profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin) && (
          <LinkRow icon={Shield} title="Moderator console" body={`Report queue & rewards${profile.modPoints > 0 ? ` · ${profile.modPoints} credits` : ""}`} onClick={() => navigate("/mod")} />
        )}
        {profile.platformRole === "member" && !profile.isAdmin && (
          <LinkRow icon={Shield} title="Become a moderator" body="Help keep VYBZ real — earn rewards" onClick={() => navigate("/apply-mod")} />
        )}
        {profile.isAdmin && (
          <LinkRow icon={ShieldCheck} title="Admin console" body="Members, staff, matchmaking & bugs" onClick={() => navigate("/admin")} />
        )}
        <LinkRow icon={Bug} title="Report a bug" body="Goes straight to the team" onClick={() => setBugOpen(true)} />
      </div>
      <ReportBugModal open={bugOpen} onClose={() => setBugOpen(false)} />

      <p className="eyebrow mb-3 flex items-center gap-1.5"><AudioLines className="h-3.5 w-3.5" /> Your library</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : (
        <UploadsLibrary initialDrops={drops} featuredId={profile.featuredDropId} onFeaturedChange={refreshProfile} />
      )}
    </div>
  );
}

function LinkRow({ icon: Icon, title, body, onClick }: { icon: typeof Bug; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3.5 text-left transition hover:bg-white/[0.02] active:scale-[0.995]">
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
    <div className="mb-5">
      <p className="eyebrow mb-3">Visual effects</p>
      <div className="flex gap-5">
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => setReduceFx(o.val)}
            className={cx("relative pb-2 text-[13px] font-medium transition",
              current === o.id ? "text-white" : "text-white/35 hover:text-white/70")}>
            {o.label}
            {current === o.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        Auto follows your device. Reduced calms the animated background and reactive border.
      </p>
      <IntensitySetting />
    </div>
  );
}

function IntensitySetting() {
  const reduced = useReduceFx();
  const intensity = useFxIntensity();
  if (reduced) return null;
  const opts: { id: "subtle" | "full"; label: string }[] = [
    { id: "subtle", label: "Subtle" },
    { id: "full", label: "Full" },
  ];
  return (
    <div className="mt-4">
      <p className="eyebrow mb-3">Reactive intensity</p>
      <div className="flex gap-5">
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => setFxIntensity(o.id)}
            className={cx("relative pb-2 text-[13px] font-medium transition",
              intensity === o.id ? "text-white" : "text-white/35 hover:text-white/70")}>
            {o.label}
            {intensity === o.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        How strongly the reactive border responds to playback.
      </p>
    </div>
  );
}

function FacetRow({ icon, label, items }: { icon?: React.ReactNode; label: string; items: string[] }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-white/35">{icon}{label}</span>
      <span className="text-white/65">{items.join(" · ")}</span>
    </p>
  );
}
