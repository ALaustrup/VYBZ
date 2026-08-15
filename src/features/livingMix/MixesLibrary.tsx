import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Play, Plus, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";

/**
 * Catalog lists that can be played as a Living Mix session.
 * Reuses vybz_lists — no new table.
 */
export function MixesLibrary() {
  const { showToast } = useSession();
  const navigate = useNavigate();
  const [lists, setLists] = useState<api.VybzList[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLists(await api.listMyVybzLists(80));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!title.trim() || busy) return;
    setBusy(true);
    const id = await api.createVybzList(title.trim(), "Living Mix pool");
    setBusy(false);
    if (!id) {
      showToast("Couldn't create mix");
      return;
    }
    setTitle("");
    showToast("Mix created — add tracks from the library");
    navigate(`/library/mix/${id}`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--app-accent-rgb))]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate("/library/mix")}
          data-testid="living-mix-open-catalog"
          className="forge-cta !min-h-10 !px-4 !text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" /> Mix this catalog
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
        className="flex gap-2"
      >
        <div className="forge-field min-w-0 flex-1 !py-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Name a mix…"
            aria-label="New mix name"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="flex items-center gap-1 rounded-full bg-white/[0.08] px-3 text-[12px] font-semibold text-white/80 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Save pool</>}
        </button>
      </form>

      {lists.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No saved pools yet"
          body="Mix the whole catalog now, or save a named pool and add tracks from the library."
        />
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id} className="forge-card flex items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white/90">{l.title}</p>
                <p className="text-[11px] text-white/40">
                  {l.trackCount} tracks · {l.isPublic ? "public" : "private"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/library/mix/${l.id}`)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white active:scale-95"
              >
                <Play className="h-3.5 w-3.5" /> Open session
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
