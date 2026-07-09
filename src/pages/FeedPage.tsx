import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, AudioLines } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import type { Drop, Reaction } from "@/types";

type FeedDrop = Drop & { myReaction?: Reaction; myRating?: number };

export function FeedPage({ onCompose }: { onCompose: () => void }) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const [drops, setDrops] = useState<FeedDrop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setDrops(await api.listDrops(50));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  function react(d: FeedDrop, r: Reaction) {
    const next = d.myReaction === r ? undefined : r;
    setDrops((list) => list.map((x) => {
      if (x.id !== d.id) return x;
      let feels = x.feels, wilds = x.wilds;
      if (x.myReaction === "feel") feels--; if (x.myReaction === "wild") wilds--;
      if (next === "feel") feels++; if (next === "wild") wilds++;
      return { ...x, feels, wilds, myReaction: next };
    }));
    if (next) void api.react(d.id, next);
  }
  function rate(d: FeedDrop, stars: number) {
    setDrops((list) => list.map((x) => (x.id === d.id ? { ...x, myRating: stars } : x)));
    void api.rateTrack(d.id, stars);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-3 max-lg:pr-14">
        <h1 className="font-display text-xl font-bold text-gradient">Drops</h1>
        <button onClick={onCompose} className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500 px-3.5 text-sm font-semibold text-white shadow-glow active:scale-95">
          <Plus className="h-4 w-4" /> Drop
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : drops.length === 0 ? (
          <EmptyState icon={AudioLines} title="No drops yet"
            body="Share a sound — a loop, a stem, a work-in-progress — and let complementary creators find it." />
        ) : (
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {drops.map((d) => (
              <TrackCard key={d.id} drop={d} queue={drops}
                onReact={(r) => react(d, r)} onRate={(s) => rate(d, s)}
                onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate("/profile")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
