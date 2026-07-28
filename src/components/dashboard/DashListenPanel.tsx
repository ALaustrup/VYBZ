import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Filter,
  Headphones,
  Heart,
  Loader2,
  ListPlus,
  MessageSquareText,
  Mic,
  MicOff,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { WaveComments } from "@/components/WaveComments";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import type { DiscoveryDrop, VybzList } from "@/lib/api";
import type { Drop } from "@/types";
import { getFavoriteIds, syncFavorites, ensureFavoritesListId } from "@/lib/favorites";
import {
  loadForYouIntoPlayer,
  loadVybzListIntoPlayer,
} from "@/lib/playerMusic";
import { cx } from "@/lib/utils";

type FilterId = "all" | "foryou" | "fresh" | "latest" | "mine" | "favorites";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "foryou", label: "For You" },
  { id: "fresh", label: "Fresh" },
  { id: "latest", label: "Latest" },
  { id: "mine", label: "Yours" },
  { id: "favorites", label: "Favorites" },
];

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Drops landing (Listen) — curated rails, filters, text + voice search.
 */
export function DashListenPanel() {
  const { userId, showToast } = useSession();
  const [drops, setDrops] = useState<DiscoveryDrop[]>([]);
  const [forYou, setForYou] = useState<DiscoveryDrop[]>([]);
  const [lists, setLists] = useState<VybzList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [listFor, setListFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [radioBusy, setRadioBusy] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [discovery, latest, forYouDrops, mineLists] = await Promise.all([
      api.listDiscovery(Date.now() % 1e9, 48),
      api.listDrops(48),
      userId ? api.listForYouDrops(16).catch(() => [] as Drop[]) : Promise.resolve([] as Drop[]),
      api.listMyVybzLists(40),
    ]);
    if (userId) void syncFavorites();

    const byId = new Map<string, DiscoveryDrop>();
    for (const d of [...discovery, ...latest]) {
      if (!d.audioUrl) continue;
      byId.set(d.id, d as DiscoveryDrop);
    }
    setDrops([...byId.values()]);
    setForYou(
      (forYouDrops as DiscoveryDrop[]).filter((d) => !!d.audioUrl).length
        ? (forYouDrops as DiscoveryDrop[]).filter((d) => !!d.audioUrl)
        : discovery.filter((d) => !!d.audioUrl && d.authorId !== userId).slice(0, 12),
    );
    setLists(mineLists);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...drops];

    if (filter === "mine") list = list.filter((d) => d.authorId === userId);
    else if (filter === "favorites") {
      const fav = new Set(getFavoriteIds());
      list = list.filter((d) => fav.has(d.id));
    } else if (filter === "foryou") {
      const ids = new Set(forYou.map((d) => d.id));
      list = list.filter((d) => ids.has(d.id));
      if (!list.length) list = [...forYou];
    } else if (filter === "fresh") {
      list = list.filter((d) => d.authorId !== userId);
    } else if (filter === "latest") {
      list = [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }

    if (q) {
      list = list.filter((d) => {
        const hay = [
          d.title,
          d.creditedArtist,
          d.authorUsername,
          d.album,
          d.releaseType,
          d.assetKind,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q) || q.split(/\s+/).every((w) => hay.includes(w));
      });
    }
    return list;
  }, [drops, filter, forYou, query, userId]);

  function toggleVoice() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      showToast("Voice search isn't supported in this browser");
      return;
    }
    if (listening) {
      try { recRef.current?.stop(); } catch { /* ignore */ }
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      setQuery(text.trim());
      if (ev.results[ev.results.length - 1]?.isFinal) {
        setFilter("all");
        setFiltersOpen(true);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      showToast("Listening… say an artist, vibe, or title");
    } catch {
      showToast("Couldn't start the mic");
      setListening(false);
    }
  }

  async function onRate(dropId: string, stars: number) {
    await api.rateTrack(dropId, stars);
    setDrops((prev) => prev.map((d) => (d.id === dropId ? { ...d, myRating: stars } : d)));
    showToast(`Rated ${stars}★`);
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
    showToast("Feedback sent");
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

  async function playForYou() {
    setRadioBusy(true);
    const n = await loadForYouIntoPlayer();
    setRadioBusy(false);
    if (!n) showToast("For You needs more listens — rate a few tracks first");
    else showToast(`For You · ${n} in VDock`);
  }

  async function playFavorites() {
    setRadioBusy(true);
    const id = await ensureFavoritesListId();
    if (!id) {
      setRadioBusy(false);
      showToast("Favorites is empty — heart a track in VDock");
      return;
    }
    const n = await loadVybzListIntoPlayer(id);
    setRadioBusy(false);
    if (!n) showToast("Favorites is empty — heart a track in VDock");
    else showToast(`Favorites · ${n} in VDock`);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Search + voice */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, titles, vibes…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/45 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          data-tip={listening ? "Stop listening" : "Voice search"}
          aria-label={listening ? "Stop voice search" : "Voice search"}
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
            listening
              ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-50 shadow-[0_0_24px_-6px_rgba(0,194,255,0.55)]"
              : "border-white/12 bg-white/[0.04] text-white/70 hover:border-cyan-300/35 hover:text-white",
          )}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          data-tip="Filters"
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
            filtersOpen
              ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-50"
              : "border-white/12 bg-white/[0.04] text-white/70 hover:text-white",
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {filtersOpen && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                filter === f.id
                  ? "bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-300/40"
                  : "bg-white/[0.05] text-white/55 hover:text-white/85",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Curated rails */}
      <section className="space-y-2">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Curated for you
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={radioBusy}
            onClick={() => void playForYou()}
            className="flex items-start gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-3.5 text-left transition hover:border-cyan-300/45 disabled:opacity-40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-100">
              {radioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[14px] font-semibold text-white">For You radio</span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                Taste + listens + ratings → a queue tuned to you
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={radioBusy}
            onClick={() => void playFavorites()}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition hover:border-rose-300/35 disabled:opacity-40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200">
              <Heart className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[14px] font-semibold text-white">Favorites</span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                Everything you hearted from VDock
              </span>
            </span>
          </button>
        </div>
        {forYou.length > 0 && filter !== "favorites" && filter !== "mine" && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 pt-1">
            {forYou.slice(0, 8).map((d) => (
              <div key={d.id} className="w-44 shrink-0">
                <TrackCard drop={d} queue={forYou} compact />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[12px] leading-relaxed text-white/40">
        {filtered.length} drop{filtered.length === 1 ? "" : "s"}
        {query ? ` matching “${query.trim()}”` : ""}
        {filter !== "all" ? ` · ${FILTERS.find((f) => f.id === filter)?.label}` : ""}.
        Play into VDock · rate & comment to sharpen curation.
      </p>

      {!filtered.length ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/40">
          {drops.length === 0
            ? "No playable drops yet — release a track with + to start the wave."
            : "Nothing matches that search / filter. Try voice search or clear filters."}
        </p>
      ) : (
        filtered.map((d) => (
          <div key={d.id} className="space-y-2">
            <TrackCard
              drop={d}
              queue={filtered}
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
                  <MessageSquareText className="h-3.5 w-3.5" /> Real feedback
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
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/8 py-2 text-[11px] font-semibold text-white/50 hover:text-white/80"
              >
                <Star className="h-3 w-3" /> Add written feedback
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
