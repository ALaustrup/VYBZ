import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Pencil, Sparkles, Star, Target, Users, BadgeCheck, ScrollText, ShieldCheck, Bug } from "lucide-react";
import { ReportBugModal } from "@/components/ReportBugModal";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import { AudioLines } from "lucide-react";
import { avatarGradient, cx } from "@/lib/utils";
import { useReduceFxOverride, setReduceFx } from "@/lib/display";
import type { Drop, CreatorStats, Credit } from "@/types";

export function ProfilePage() {
  const { profile, userId, signOut } = useSession();
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

  if (!profile) return null;
  const facets = profile.profile ?? {};
  const [c0, c1] = avatarGradient(profile.username || profile.id);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6 pt-3">
      <div className="mb-4 flex items-center gap-4 max-lg:pr-14">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-bold text-white" style={{ background: `linear-gradient(150deg, ${c0}, ${c1})` }}>
          {(profile.username || "Y").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-white">{profile.username}</h1>
          {facets.roleLabel && <p className="truncate text-sm font-semibold text-veil-200">{facets.roleLabel}</p>}
          {profile.location && <p className="text-sm text-white/50">{profile.location}</p>}
        </div>
        <button onClick={() => navigate("/profile/edit")} aria-label="Edit" className="flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90"><Pencil className="h-4 w-4" /></button>
        <button onClick={signOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90"><LogOut className="h-4 w-4" /></button>
      </div>

      {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
          {stats.reputation >= 0.5 && <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-bold uppercase tracking-wide text-amber-300"><Star className="h-3 w-3" fill="currentColor" /> Proven</span>}
          {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />{stats.avgRating.toFixed(1)} · {stats.ratings} {stats.ratings === 1 ? "rating" : "ratings"}</span>}
          <span>{stats.drops} {stats.drops === 1 ? "drop" : "drops"}</span>
          {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.connections}</span>}
        </div>
      )}
      {profile.bio && <p className="mb-4 text-sm leading-relaxed text-white/75">{profile.bio}</p>}

      <div className="mb-4 space-y-2">
        {roles.offers.length > 0 && <FacetRow icon={<Sparkles className="h-3.5 w-3.5 text-feel" />} label="I bring" items={roles.offers} tone="bg-feel/15 text-feel" />}
        {roles.seeks.length > 0 && <FacetRow icon={<Target className="h-3.5 w-3.5 text-aqua-300" />} label="Looking for" items={roles.seeks} tone="bg-aqua-400/15 text-aqua-200" />}
        {facets.genres?.length ? <FacetRow label="Genres" items={facets.genres} tone="bg-veil-500/20 text-veil-100" /> : null}
        {facets.daws?.length ? <FacetRow label="DAWs" items={facets.daws} tone="bg-white/8 text-white/75" /> : null}
      </div>

      {(roles.offers.length === 0 && roles.seeks.length === 0) && (
        <button onClick={() => navigate("/profile/edit")} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-aqua-400/25 bg-aqua-400/[0.06] p-3.5 text-left active:scale-[0.99]">
          <Target className="h-5 w-5 shrink-0 text-aqua-300" />
          <p className="text-xs text-white/70">Add the roles you <span className="font-semibold text-white">bring</span> and <span className="font-semibold text-white">seek</span> — that's what powers precise collaborator matches.</p>
        </button>
      )}

      {credits.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><BadgeCheck className="h-3.5 w-3.5 text-feel" /> Verified credits</p>
          <div className="space-y-1.5">
            {credits.map((c) => (
              <div key={c.projectId} className="flex items-center gap-2 rounded-xl border border-feel/15 bg-feel/[0.05] px-3 py-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-feel" />
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.title}</span>
                {c.role && <span className="shrink-0 text-[11px] text-white/50">{c.role}</span>}
                {c.split != null && <span className="shrink-0 text-[11px] font-semibold text-feel">{c.split}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <DisplaySetting />

      <button onClick={() => navigate("/codex")} className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left active:scale-[0.99]">
        <ScrollText className="h-4 w-4 shrink-0 text-veil-300" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">VYBZ Codex & Legal</span><span className="block text-[11px] text-white/45">Free contracts, licenses & templates · Terms, Privacy, DMCA</span></span>
      </button>

      {profile.isAdmin && (
        <button onClick={() => navigate("/admin")} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-veil-400/25 bg-veil-500/[0.08] p-4 text-left active:scale-[0.99]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-veil-200" />
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-white">Admin console</span><span className="block text-xs text-white/55">Members, matchmaking weights, role requests & bug reports</span></span>
        </button>
      )}

      <button onClick={() => setBugOpen(true)} className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left active:scale-[0.99]">
        <Bug className="h-4 w-4 shrink-0 text-white/60" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">Report a bug</span><span className="block text-[11px] text-white/45">Something off? Tell us — it goes straight to the team.</span></span>
      </button>
      <ReportBugModal open={bugOpen} onClose={() => setBugOpen(false)} />

      <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Your drops</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : drops.length === 0 ? (
        <EmptyState icon={AudioLines} title="No drops yet" body="Share your first sound from the feed." />
      ) : (
        <div className="space-y-4">
          {/* Featured drop hero (most recent), then the rest. */}
          <TrackCard drop={drops[0]} queue={drops} />
          {drops.length > 1 && (
            <div className="grid gap-4 sm:grid-cols-2">{drops.slice(1).map((d) => <TrackCard key={d.id} drop={d} queue={drops} compact />)}</div>
          )}
        </div>
      )}
    </div>
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
    <div className="mb-4">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Visual effects</p>
      <div className="flex gap-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {opts.map((o) => (
          <button key={o.id} onClick={() => setReduceFx(o.val)}
            className={cx("flex-1 rounded-xl py-2 text-sm font-semibold transition",
              current === o.id ? "bg-veil-500/20 text-white ring-1 ring-veil-400/40" : "text-white/50 hover:text-white/80")}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-white/40">
        Auto follows your device. Reduced calms the animated background, reactive border, and visualizers for better battery and performance.
      </p>
    </div>
  );
}

function FacetRow({ icon, label, items, tone }: { icon?: React.ReactNode; label: string; items: string[]; tone: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">{icon}{label}</span>
      {items.map((i) => <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{i}</span>)}
    </div>
  );
}
