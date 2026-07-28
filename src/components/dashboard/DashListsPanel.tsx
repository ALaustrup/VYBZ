import { useCallback, useEffect, useState } from "react";
import { ListMusic, Loader2, Play, Plus } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { loadVybzListIntoPlayer } from "@/lib/playerMusic";

/** Collaborative / personal VYBZ lists → VDock. */
export function DashListsPanel() {
  const { showToast } = useSession();
  const [lists, setLists] = useState<api.VybzList[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLists(await api.listMyVybzLists(40));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!title.trim() || busy) return;
    setBusy(true);
    const id = await api.createVybzList(title.trim());
    setBusy(false);
    if (!id) {
      showToast("Couldn't create list");
      return;
    }
    setTitle("");
    showToast("List created — add tracks from Listen");
    await load();
  }

  async function play(id: string) {
    setBusy(true);
    const n = await loadVybzListIntoPlayer(id);
    setBusy(false);
    if (!n) showToast("List is empty — add drops first");
    else showToast(`Queued ${n} tracks on VDock`);
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-white/45">
        Collaborative playlists of VYBZ uploads. Heart a track in VDock to save it to your <span className="text-white/70">Favorites</span> list automatically. Create more lists for listening parties.
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); void create(); }}
        className="flex gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="New playlist name…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
        />
        <button type="submit" disabled={busy || !title.trim()} className="btn btn-primary h-10 px-3 text-xs disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Create</>}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>
      ) : lists.length === 0 ? (
        <p className="rounded-2xl border border-white/8 px-4 py-8 text-center text-sm text-white/40">
          <ListMusic className="mx-auto mb-2 h-6 w-6 text-white/25" />
          No lists yet — make one for a late-night listening party.
        </p>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--neon-cyan)/0.15)] text-cyan-200">
                <ListMusic className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-white">{l.title}</p>
                <p className="text-[11px] text-white/40">{l.trackCount} tracks · {l.isPublic ? "public" : "private"}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void play(l.id)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white active:scale-95 disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" /> Play
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
