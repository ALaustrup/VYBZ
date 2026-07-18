import { useEffect, useState } from "react";
import { AudioLines, Check, Loader2, Pencil, Play, Star, Trash2, X } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

/**
 * The creator's own upload manager (Library). Lists their drops with per-drop
 * stats and inline management — rename, feature-on-profile, and delete — all
 * owner-scoped (edit/delete via RLS, feature via a guarded RPC). The featured
 * drop headlines the profile; everything else follows in a grid.
 */
export function UploadsLibrary({
  initialDrops,
  featuredId,
  onFeaturedChange,
}: {
  initialDrops: Drop[];
  featuredId?: string | null;
  onFeaturedChange?: () => void;
}) {
  const { showToast } = useSession();
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  useEffect(() => { setDrops(initialDrops); }, [initialDrops]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (drops.length === 0) {
    return <EmptyState icon={AudioLines} title="No drops yet" body="Share your first sound from the feed — it'll live here for you to manage." />;
  }

  const featured = drops.find((d) => d.id === featuredId) ?? drops[0];
  const rest = drops.filter((d) => d.id !== featured.id);

  async function feature(d: Drop) {
    setBusy(d.id);
    const ok = await api.setFeaturedDrop(d.id);
    setBusy(null);
    if (ok) { showToast("Featured on your profile"); onFeaturedChange?.(); } else showToast("Couldn't feature that");
  }
  async function saveTitle(d: Drop) {
    setBusy(d.id);
    const t = editTitle.trim();
    const ok = await api.updateDropTitle(d.id, t);
    setBusy(null);
    if (ok) { setDrops((l) => l.map((x) => (x.id === d.id ? { ...x, title: t || null } : x))); setEditing(null); showToast("Renamed"); }
    else showToast("Couldn't rename");
  }
  async function remove(d: Drop) {
    setBusy(d.id);
    const ok = await api.deleteDrop(d.id);
    setBusy(null);
    setConfirmDel(null);
    if (ok) {
      setDrops((l) => l.filter((x) => x.id !== d.id));
      if (d.id === featuredId) onFeaturedChange?.();
      showToast("Drop deleted");
    } else showToast("Couldn't delete");
  }

  function Manage({ d, isFeatured }: { d: Drop; isFeatured: boolean }) {
    const working = busy === d.id;
    if (confirmDel === d.id) {
      return (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-wild/30 bg-wild/[0.06] px-3 py-2">
          <span className="mr-auto text-[12px] text-white/80">Delete this drop permanently?</span>
          <button onClick={() => remove(d)} disabled={working} className="flex items-center gap-1 rounded-full bg-wild/80 px-3 py-1 text-[12px] font-semibold text-white active:scale-95">
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3 w-3" /> Delete</>}
          </button>
          <button onClick={() => setConfirmDel(null)} className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/70 active:scale-95">Cancel</button>
        </div>
      );
    }
    if (editing === d.id) {
      return (
        <div className="mt-2 flex items-center gap-2">
          <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value.slice(0, 80))} placeholder="Drop title…"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <button onClick={() => saveTitle(d)} disabled={working} aria-label="Save" className="flex h-8 w-8 items-center justify-center rounded-lg bg-veil-500/30 text-white active:scale-95">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button onClick={() => setEditing(null)} aria-label="Cancel" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 active:scale-95"><X className="h-4 w-4" /></button>
        </div>
      );
    }
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="mr-auto flex items-center gap-3 text-[11px] text-white/45">
          <span className="flex items-center gap-1" title="Plays"><Play className="h-3 w-3" />{d.plays ?? 0}</span>
          <span title="Vyb reactions">♥ {d.feels}</span>
          <span title="Fail reactions">✕ {d.wilds}</span>
          {d.ratingCount ? <span className="flex items-center gap-1" title="Rating"><Star className="h-3 w-3 text-amber-300" fill="currentColor" />{(d.rating ?? 0).toFixed(1)} ({d.ratingCount})</span> : null}
        </span>
        {isFeatured ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"><Star className="h-3 w-3" fill="currentColor" /> Featured</span>
        ) : (
          <button onClick={() => feature(d)} disabled={working} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95">
            {working ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Star className="h-3 w-3" /> Feature</>}
          </button>
        )}
        <button onClick={() => { setEditing(d.id); setEditTitle(d.title ?? ""); }} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95"><Pencil className="h-3 w-3" /> Edit</button>
        <button onClick={() => setConfirmDel(d.id)} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:text-wild active:scale-95"><Trash2 className="h-3 w-3" /> Delete</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <TrackCard drop={featured} queue={drops} />
        <Manage d={featured} isFeatured />
      </div>
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {rest.map((d) => (
            <div key={d.id} className={cx(confirmDel === d.id && "rounded-2xl ring-1 ring-wild/30")}>
              <TrackCard drop={d} queue={drops} compact />
              <Manage d={d} isFeatured={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
