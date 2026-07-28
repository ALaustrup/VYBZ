import { useCallback, useEffect, useState } from "react";
import { ListPlus, Loader2, MessageSquareText, Star } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { WaveComments } from "@/components/WaveComments";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import type { DiscoveryDrop } from "@/lib/api";
import { cx } from "@/lib/utils";

/** Listen to others' uploads → earn Vc; ratings + wave comments + notes + add to list. */
export function DashListenPanel() {
  const { userId, showToast } = useSession();
  const [drops, setDrops] = useState<DiscoveryDrop[]>([]);
  const [lists, setLists] = useState<api.VybzList[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [listFor, setListFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, mine] = await Promise.all([
      api.listDiscovery(Date.now() % 1e9, 40),
      api.listMyVybzLists(40),
    ]);
    setDrops(all.filter((d) => d.authorId !== userId && d.audioUrl));
    setLists(mine);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function onRate(dropId: string, stars: number) {
    await api.rateTrack(dropId, stars);
    setDrops((prev) => prev.map((d) => (d.id === dropId ? { ...d, myRating: stars } : d)));
    showToast(`Rated ${stars}★ · +0.25 Vc (if under daily cap)`);
    setNoteFor(dropId);
  }

  async function submitNote(dropId: string) {
    setBusy(true);
    const res = await api.submitDropFeedback(dropId, note);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error === "too_short" ? "Write at least 8 characters" : res.error || "Feedback rejected");
      return;
    }
    showToast("Feedback sent · +0.15 Vc (if under daily cap)");
    setNote("");
    setNoteFor(null);
  }

  async function addToList(listId: string, dropId: string) {
    setBusy(true);
    const ok = await api.addToVybzList(listId, dropId);
    setBusy(false);
    if (!ok) {
      showToast("Couldn't add to list");
      return;
    }
    showToast("Added to list");
    setListFor(null);
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, trackCount: l.trackCount + 1 } : l)));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>;
  }

  if (!drops.length) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/40">
        No network drops yet. When others upload, listen here to earn Vc — real feedback pays more.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-white/45">
        High-quality stream into VDock. Play ≥30s to earn listen Vc. Stars, wave comments, and written notes earn more — and sharpen discovery.
      </p>
      {drops.map((d) => (
        <div key={d.id} className="space-y-2">
          <TrackCard
            drop={d}
            queue={drops}
            onRate={(stars) => void onRate(d.id, stars)}
            onReact={(r) => {
              void api.react(d.id, r);
              setDrops((prev) => prev.map((x) => (x.id === d.id ? { ...x, myReaction: r } : x)));
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setListFor((v) => (v === d.id ? null : d.id))}
              className="flex items-center gap-1.5 rounded-xl border border-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80"
            >
              <ListPlus className="h-3.5 w-3.5" /> Add to list
            </button>
          </div>
          {listFor === d.id && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              {lists.length === 0 ? (
                <p className="text-[12px] text-white/45">Create a list under You → Lists first.</p>
              ) : (
                <ul className="space-y-1.5">
                  {lists.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void addToList(l.id, d.id)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-40"
                      >
                        <span className="truncate font-medium">{l.title}</span>
                        <span className="text-[11px] text-white/35">{l.trackCount}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <WaveComments dropId={d.id} />
          {noteFor === d.id && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
                <MessageSquareText className="h-3.5 w-3.5" /> Real feedback (extra Vc)
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="What worked? Mix, vibe, hook…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitNote(d.id)}
                  className="btn btn-primary flex-1 py-2 text-xs disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send feedback"}
                </button>
                <button type="button" onClick={() => { setNoteFor(null); setNote(""); }} className="btn btn-ghost px-3 py-2 text-xs">
                  Skip
                </button>
              </div>
            </div>
          )}
          {d.myRating != null && noteFor !== d.id && (
            <button
              type="button"
              onClick={() => setNoteFor(d.id)}
              className={cx(
                "flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/8 py-2 text-[11px] font-semibold text-white/50 hover:text-white/80",
              )}
            >
              <Star className="h-3 w-3" /> Add written feedback
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
