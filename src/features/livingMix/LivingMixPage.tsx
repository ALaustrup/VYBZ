import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AudioLines, Layers, Loader2, Play, RefreshCw, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ForgeChip, ToolWorkbench } from "@/components/ToolWorkbench";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { loadQueue, spliceUpcoming, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import * as api from "@/lib/api";
import type { Drop } from "@/types";
import {
  MIX_INTENT_LABEL,
  MIX_INTENTS,
  planSession,
  reasonCopy,
  sessionSeed,
  type MixIntent,
  type MixPick,
} from "./engine";
import { dropToCandidate, playableDrops } from "./fromDrops";
import { loadListCatalog, loadOwnerCatalog } from "./loadPool";

const POOL_KEY = "vybz.livingMix.poolIds";

type LocState = { dropIds?: string[] };

export function LivingMixPage() {
  const { listId } = useParams<{ listId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const player = usePlayer();

  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState<MixIntent>("steady");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [picks, setPicks] = useState<MixPick[]>([]);
  const [listTitle, setListTitle] = useState<string | null>(null);

  const locIds = (location.state as LocState | null)?.dropIds;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (listId) {
        const [pool, lists] = await Promise.all([
          loadListCatalog(listId),
          api.listMyVybzLists(80),
        ]);
        setDrops(pool);
        setListTitle(lists.find((l) => l.id === listId)?.title ?? "Mix");
      } else if (locIds?.length) {
        try {
          sessionStorage.setItem(POOL_KEY, JSON.stringify(locIds));
        } catch {
          /* ignore */
        }
        setDrops(await api.dropsByIds(locIds));
        setListTitle("Selection");
      } else {
        let cached: string[] = [];
        try {
          cached = JSON.parse(sessionStorage.getItem(POOL_KEY) || "[]") as string[];
        } catch {
          cached = [];
        }
        if (cached.length) {
          setDrops(await api.dropsByIds(cached));
          setListTitle("Selection");
        } else {
          setDrops(await loadOwnerCatalog(userId));
          setListTitle("Your catalog");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId, listId, locIds]);

  useEffect(() => {
    void load();
  }, [load]);

  useRegisterAppBar({ title: "Living Mix", subtitle: listTitle ?? "Catalog session" }, [listTitle]);

  const playable = useMemo(() => playableDrops(drops), [drops]);
  const byId = useMemo(() => new Map(playable.map((d) => [d.id, d])), [playable]);
  const stemCount = playable.filter((d) => d.assetKind === "stem" || d.assetKind === "loop").length;

  const seed = startedAt != null ? sessionSeed(listId ?? "catalog", startedAt) : null;

  function tracksFrom(plan: MixPick[]) {
    return plan
      .map((p) => byId.get(p.candidate.id))
      .filter((d): d is Drop => Boolean(d))
      .map(toPlayerTrack);
  }

  function startSession() {
    const candidates = playable.map(dropToCandidate).filter((c): c is NonNullable<typeof c> => c != null);
    if (!candidates.length) {
      showToast("No playable audio in this pool");
      return;
    }
    const at = Date.now();
    const nextSeed = sessionSeed(listId ?? "catalog", at);
    const plan = planSession(candidates, intent, nextSeed);
    setStartedAt(at);
    setPicks(plan);
    loadQueue(tracksFrom(plan), { autoplay: true });
    showToast(`Living Mix · ${plan.length} in VDock`);
  }

  function evolveRemaining() {
    const currentId = player.track?.id;
    if (!currentId || startedAt == null) {
      startSession();
      return;
    }
    const candidates = playable.map(dropToCandidate).filter((c): c is NonNullable<typeof c> => c != null);
    const history = picks.map((p) => p.candidate.id);
    const playedThrough = history.indexOf(currentId);
    const kept = playedThrough >= 0 ? picks.slice(0, playedThrough + 1) : picks;
    const nextSeed = sessionSeed(listId ?? "catalog", startedAt) ^ Math.imul(intent.length, 0x85ebca6b);
    const rest = planSession(candidates, intent, nextSeed, Math.max(8, candidates.length)).filter(
      (p) => p.candidate.id !== currentId,
    );
    const next = [...kept, ...rest];
    setPicks(next);
    spliceUpcoming(tracksFrom(rest));
    showToast("Upcoming sequence evolved");
  }

  const currentPick = picks.find((p) => p.candidate.id === player.track?.id) ?? picks[0];

  return (
    <ToolWorkbench
      wide
      eyebrow="Library"
      title="Living Mix"
      subtitle="A new seed each play. Not a frozen playlist."
      testId="living-mix"
      className="flex h-full !max-w-5xl min-h-0 flex-col !pb-4 !pt-2"
    >
      <p className="-mt-2 text-[12px] leading-relaxed text-white/40" data-testid="living-mix-honesty">
        Energy is what you pick, not a mood we measured. Nothing is morphed on the play
        path. Stem Maker is one menu away. Stems are not auto-generated here.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--app-accent-rgb))]" />
        </div>
      ) : playable.length === 0 ? (
        <EmptyState
          icon={AudioLines}
          title="Nothing playable yet"
          body="Add audio to your library, then drop it into a Living Mix."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Energy</span>
            {MIX_INTENTS.map((id) => (
              <ForgeChip
                key={id}
                active={intent === id}
                onClick={() => setIntent(id)}
                testId={`living-mix-intent-${id}`}
              >
                {MIX_INTENT_LABEL[id]}
              </ForgeChip>
            ))}
            <span className="ml-auto font-mono text-[11px] text-white/35">
              {playable.length} playable
              {seed != null ? ` · seed ${seed.toString(16)}` : ""}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startSession}
              data-testid="living-mix-start"
              className="forge-cta !min-h-10 !px-4 !text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              {startedAt ? "New session" : "Start session"}
            </button>
            <button
              type="button"
              onClick={evolveRemaining}
              disabled={!startedAt}
              data-testid="living-mix-evolve"
              className="flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-[12px] font-semibold text-white/80 hover:text-white active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Evolve remaining
            </button>
            <button
              type="button"
              onClick={() => navigate("/tools/stems")}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-[12px] font-semibold text-white/70 hover:text-white active:scale-95"
            >
              <Layers className="h-3.5 w-3.5" /> Stems
              {stemCount > 0 ? <span className="font-mono text-[10px] text-white/40">{stemCount}</span> : null}
            </button>
          </div>

          {currentPick && player.track && (
            <section className="forge-glass relative !rounded-2xl p-4" aria-label="Now in session">
              <span className="forge-glass-edge pointer-events-none" aria-hidden />
              <div className="relative z-[1]">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--app-accent-rgb))]" /> Now
                </p>
                <p className="mt-1 truncate font-display text-lg text-white">{player.track.title}</p>
                <p className="text-[13px] text-white/50">{player.track.artist}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {currentPick.reasons.map((r) => (
                    <li
                      key={r}
                      className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/55"
                    >
                      {reasonCopy(r)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section aria-label="Session evolution">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Evolution
            </p>
            {picks.length === 0 ? (
              <p className="text-[13px] text-white/40">Start a session to see why each track was picked.</p>
            ) : (
              <ol className="no-scrollbar max-h-72 space-y-1 overflow-y-auto" data-testid="living-mix-evolution">
                {picks.map((p, i) => {
                  const drop = byId.get(p.candidate.id);
                  const active = player.track?.id === p.candidate.id;
                  return (
                    <li
                      key={`${p.candidate.id}-${i}`}
                      className={`rounded-xl px-3 py-2 ${active ? "bg-[rgb(var(--app-accent-rgb)/0.16)]" : "bg-white/[0.03]"}`}
                    >
                      <p className="truncate text-[13px] text-white/85">
                        {i + 1}. {drop?.title?.trim() || "Untitled"}
                      </p>
                      <p className="truncate text-[11px] text-white/40">
                        {p.reasons.map(reasonCopy).join(" · ")}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </ToolWorkbench>
  );
}
