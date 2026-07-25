import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Disc3, Loader2, Music2, Repeat, Sparkles, Star, Target, UserPlus, X, SlidersHorizontal } from "lucide-react";
import * as api from "@/lib/api";
import { NetworkModes } from "@/components/network/NetworkModes";
import { MatchHardFiltersPanel } from "@/components/network/MatchHardFiltersPanel";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { haptic, cx } from "@/lib/utils";
import { confidenceRead } from "@/lib/confidence";
import { ROLE_CLASS_LABEL, isAdjacentClass, PROFESSION_LABEL, craftScope } from "@/lib/profileFields";
import {
  loadMatchFilters, saveMatchFilters, matchFilterCount, type MatchHardFilters,
} from "@/lib/matchFilters";
import type { CollabMatch } from "@/types";

function gradientFor(id: string): string {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `linear-gradient(160deg, hsl(${h} 70% 22%) 0%, hsl(${(h + 40) % 360} 65% 12%) 60%, #060810 100%)`;
}

export function SparkPage() {
  const navigate = useNavigate();
  const { showToast, profile } = useSession();
  const [deck, setDeck] = useState<CollabMatch[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MatchHardFilters>(loadMatchFilters);
  const [showFilters, setShowFilters] = useState(false);
  const busy = useRef(false);
  const activeCount = matchFilterCount(filters);

  useRegisterAppBar({
    actions: (
      <button
        type="button"
        onClick={() => setShowFilters((s) => !s)}
        aria-label="Must-have filters"
        aria-expanded={showFilters}
        className={cx(
          "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
          showFilters || activeCount > 0
            ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40"
            : "glass text-white/70",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {activeCount > 0 ? activeCount : "Filters"}
      </button>
    ),
  }, [showFilters, activeCount]);

  const craft = craftScope(profile?.profile?.profession);
  const load = useCallback(async () => {
    setLoading(true);
    setDeck(await api.collabMatches(40, craft, filters));
    setIdx(0);
    setLoading(false);
  }, [craft, filters]);
  useEffect(() => { void load(); }, [load]);

  function updateFilters(next: MatchHardFilters) {
    setFilters(next);
    saveMatchFilters(next);
  }

  const act = useCallback((c: CollabMatch, connect: boolean) => {
    if (busy.current) return; busy.current = true;
    haptic(connect ? 14 : 8);
    setIdx((i) => i + 1);
    if (connect) {
      void api.connect(c.userId);
      void api.logMatchFeedback(c.userId, "connect", "spark");
      showToast(`Connection sent to ${c.username ?? "creator"}`);
    } else {
      void api.logMatchFeedback(c.userId, "pass", "spark");
    }
    busy.current = false;
  }, [showToast]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-1 pt-2">
        <NetworkModes />
        {showFilters && <MatchHardFiltersPanel filters={filters} onChange={updateFilters} />}
      </div>
      <div className="relative flex-1 px-4 pb-6 pt-1">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : idx >= deck.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-veil-200" />
            <h2 className="font-display text-lg font-bold text-white">
              {activeCount > 0 && deck.length === 0 ? "No cards with these must-haves" : "You're all caught up"}
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-white/55">
              {activeCount > 0 && deck.length === 0
                ? "Clear remote, DAW, or language filters to refill the deck."
                : "Add your offered/sought roles on your profile so more complementary musicians surface."}
            </p>
            {activeCount > 0 && deck.length === 0 ? (
              <button onClick={() => updateFilters({ remoteOnly: false, daw: "", language: "" })} className="btn btn-ghost mt-5 px-5 text-xs">Clear filters</button>
            ) : (
              <button onClick={load} className="btn btn-ghost mt-5 px-5 text-xs">Refresh</button>
            )}
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-sm">
            <AnimatePresence>
              {deck.slice(idx, idx + 2).reverse().map((c) => (
                <SparkCard key={c.userId} c={c} depth={deck.indexOf(c) - idx} onAct={act} onOpen={() => navigate(`/u/${c.userId}`)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function SparkCard({ c, depth, onAct, onOpen }: { c: CollabMatch; depth: number; onAct: (c: CollabMatch, connect: boolean) => void; onOpen: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const connectOp = useTransform(x, [20, 130], [0, 1]);
  const passOp = useTransform(x, [-130, -20], [1, 0]);
  const active = depth === 0;
  const name = c.username || "Creator";

  function onEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 700) onAct(c, info.offset.x > 0);
  }
  return (
    <motion.div className="absolute inset-0 touch-none" style={{ x: active ? x : 0, rotate: active ? rotate : 0, zIndex: 10 - depth }}
      drag={active ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={onEnd}
      initial={false} animate={{ scale: 1 - depth * 0.04, y: depth * 14 }}
      exit={{ x: (x.get() >= 0 ? 1 : -1) * 600, opacity: 0, transition: { duration: 0.32 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="match-bloom relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[var(--mat-depth)]" style={{ background: gradientFor(c.userId) }}>
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4 opacity-20"><span className="font-display text-[10rem] font-black leading-none text-white">{name.charAt(0).toUpperCase()}</span></div>
        {active && <>
          <motion.div style={{ opacity: connectOp, rotate: -12 }} className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase text-feel"><UserPlus className="h-6 w-6" /> Connect</motion.div>
          <motion.div style={{ opacity: passOp, rotate: 12 }} className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-white/50 px-4 py-2 font-display text-2xl font-bold uppercase text-white/70"><X className="h-6 w-6" /> Pass</motion.div>
        </>}
        <div className="relative mt-auto flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
          <div className="flex items-end justify-between gap-2">
            <button onClick={onOpen} className="font-display text-2xl font-bold text-white">{name}</button>
            <div className="relative z-[1] flex flex-col items-end gap-1">
              <span className="relative overflow-hidden rounded-full border border-cyan-300/30 bg-black/35 px-2.5 py-0.5 font-display text-sm font-semibold text-cyan-100 shadow-[0_0_24px_-6px_rgba(0,255,200,0.55)]">
                <span className="relative z-[1]">{Math.round(c.fit * 100)}% fit</span>
              </span>
              {(() => { const r = confidenceRead(c.confidence); return (
                <span className={`flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold ${r.tone}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.label}
                </span>
              ); })()}
              {c.mutual && <span className="flex items-center gap-1 rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel"><Repeat className="h-3 w-3" /> Mutual</span>}
              {isAdjacentClass(c.roleClass) && <span className="flex items-center gap-1 rounded-full bg-aqua-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-100">{ROLE_CLASS_LABEL[c.roleClass as string] ?? c.roleClass}</span>}
              {c.reputation >= 0.5 && <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"><Star className="h-3 w-3" fill="currentColor" /> Proven</span>}
            </div>
          </div>
          {c.offersYouSeek.length > 0 && <p className="flex flex-wrap items-center gap-1 text-xs"><Music2 className="h-3.5 w-3.5 text-feel" /><span className="text-white/45">Has what you want:</span><span className="font-semibold text-feel">{c.offersYouSeek.join(" · ")}</span></p>}
          {c.seeksYouOffer.length > 0 && <p className="flex flex-wrap items-center gap-1 text-xs"><Target className="h-3.5 w-3.5 text-aqua-300" /><span className="text-white/45">Wants what you bring:</span><span className="font-semibold text-aqua-200">{c.seeksYouOffer.join(" · ")}</span></p>}
          {(c.sharedProfessions?.length ?? 0) > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-veil-300" />
              <span className="text-white/45">Same lane:</span>
              <span className="font-semibold text-white/80">{(c.sharedProfessions ?? []).map((id) => PROFESSION_LABEL[id] ?? id).join(" · ")}</span>
            </p>
          )}
          {(c.sharedGenres.length > 0 || c.sharedDaws.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {c.sharedGenres.slice(0, 3).map((g) => <span key={g} className="rounded-full bg-veil-500/30 px-2.5 py-1 text-[11px] font-medium text-white">{g}</span>)}
              {c.sharedDaws.slice(0, 2).map((d) => <span key={d} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80"><Disc3 className="h-2.5 w-2.5" /> {d}</span>)}
            </div>
          )}
        </div>
        {active && (
          <div className="absolute inset-x-0 bottom-0 z-[2] flex translate-y-1/2 items-center justify-center gap-5">
            <button onClick={() => onAct(c, false)} aria-label="Pass" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-ink-950/90 text-white/70 shadow-[var(--mat-specular),var(--mat-depth)] active:scale-90"><X className="h-6 w-6" /></button>
            <button onClick={() => onAct(c, true)} aria-label="Connect" className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-gradient-to-b from-emerald-300 to-teal-400 text-ink-950 shadow-[0_12px_32px_-12px_rgba(52,245,160,0.75)] active:scale-90"><UserPlus className="h-7 w-7" /></button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
