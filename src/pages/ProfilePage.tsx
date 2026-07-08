import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Pencil, Sparkles, Target } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import { AudioLines } from "lucide-react";
import { avatarGradient } from "@/lib/utils";
import type { Drop } from "@/types";

export function ProfilePage() {
  const { profile, userId, signOut } = useSession();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<{ offers: string[]; seeks: string[] }>({ offers: [], seeks: [] });
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.rolesFor(userId), api.dropsBy(userId, 20)]).then(([r, d]) => {
      setRoles(r); setDrops(d); setLoading(false);
    });
  }, [userId]);

  if (!profile) return null;
  const facets = profile.profile ?? {};
  const [c0, c1] = avatarGradient(profile.username || profile.id);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6 pt-3">
      <div className="mb-4 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-bold text-white" style={{ background: `linear-gradient(150deg, ${c0}, ${c1})` }}>
          {(profile.username || "Y").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-white">{profile.username}</h1>
          {profile.location && <p className="text-sm text-white/50">{profile.location}</p>}
        </div>
        <button onClick={() => navigate("/profile/edit")} aria-label="Edit" className="flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90"><Pencil className="h-4 w-4" /></button>
        <button onClick={signOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90"><LogOut className="h-4 w-4" /></button>
      </div>

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

      <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Your drops</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : drops.length === 0 ? (
        <EmptyState icon={AudioLines} title="No drops yet" body="Share your first sound from the feed." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{drops.map((d) => <TrackCard key={d.id} drop={d} queue={drops} />)}</div>
      )}
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
