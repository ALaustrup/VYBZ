import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import {
  Ban, Disc3, Flag, Heart, Loader2, MapPin, Music2, Repeat, Sparkles, Star,
  Target, UserPlus, X, SlidersHorizontal, Footprints,
} from "lucide-react";
import * as api from "@/lib/api";
import { FreeConnectActions } from "@/components/FreeConnectActions";
import { MutualMatchCelebration } from "@/components/MutualMatchCelebration";
import { ReportModal } from "@/components/ReportModal";
import { NetworkModes } from "@/components/network/NetworkModes";
import { MatchHardFiltersPanel } from "@/components/network/MatchHardFiltersPanel";
import { LoveMeetupFiltersPanel } from "@/components/network/LoveMeetupFiltersPanel";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { haptic, cx } from "@/lib/utils";
import { confidenceRead } from "@/lib/confidence";
import { ROLE_CLASS_LABEL, isAdjacentClass, PROFESSION_LABEL, craftScope, isAdultBirthYear, hasRomanticLookingFor } from "@/lib/profileFields";
import {
  loadMatchFilters, saveMatchFilters, matchFilterCount, type MatchHardFilters,
} from "@/lib/matchFilters";
import {
  loadSparkFilters, saveSparkFilters, sparkFilterCount, type SparkLoveMeetupFilters,
} from "@/lib/sparkFilters";
import type { CollabMatch, SparkDeck, VibeMatch } from "@/types";

function gradientFor(id: string): string {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `linear-gradient(160deg, hsl(${h} 70% 22%) 0%, hsl(${(h + 40) % 360} 65% 12%) 60%, #060810 100%)`;
}

type DeckCard =
  | { kind: "create"; c: CollabMatch }
  | { kind: "vibe"; c: VibeMatch };

export function SparkPage() {
  const navigate = useNavigate();
  const { showToast, profile } = useSession();
  const [deckMode, setDeckMode] = useState<SparkDeck>("create");
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createFilters, setCreateFilters] = useState<MatchHardFilters>(loadMatchFilters);
  const [vibeFilters, setVibeFilters] = useState<SparkLoveMeetupFilters>(loadSparkFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [celebration, setCelebration] = useState<{ peerId: string; peerName: string | null; deck: "love" | "meetup" } | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const busy = useRef(false);

  const createCount = matchFilterCount(createFilters);
  const vibeCount = sparkFilterCount(vibeFilters);
  const activeCount = deckMode === "create" ? createCount : vibeCount;
  const adultOk = isAdultBirthYear(profile?.profile?.birthYear);
  const romanticBlocked = deckMode === "love" && hasRomanticLookingFor(profile?.profile?.lookingFor) && !adultOk;

  useRegisterAppBar({
    actions: (
      <button
        type="button"
        onClick={() => setShowFilters((s) => !s)}
        aria-label="Filters"
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
    if (deckMode === "create") {
      const rows = await api.collabMatches(40, craft, createFilters);
      setDeck(rows.map((c) => ({ kind: "create" as const, c })));
    } else {
      const rows = await api.vibeMatches(deckMode, 40, {
        radiusMiles: vibeFilters.radiusMiles,
        ageMin: vibeFilters.ageMin,
        ageMax: vibeFilters.ageMax,
        lookingFor: vibeFilters.lookingFor,
        meetupIntents: vibeFilters.meetupIntents,
        mustShareMeetup: vibeFilters.mustShareMeetup,
      });
      setDeck(rows.map((c) => ({ kind: "vibe" as const, c })));
    }
    setIdx(0);
    setLoading(false);
  }, [craft, createFilters, vibeFilters, deckMode]);

  useEffect(() => { void load(); }, [load]);

  function updateCreateFilters(next: MatchHardFilters) {
    setCreateFilters(next);
    saveMatchFilters(next);
  }
  function updateVibeFilters(next: SparkLoveMeetupFilters) {
    setVibeFilters(next);
    saveSparkFilters(next);
  }

  const act = useCallback(async (card: DeckCard, like: boolean) => {
    if (busy.current) return;
    busy.current = true;
    haptic(like ? 14 : 8);
    setIdx((i) => i + 1);

    if (card.kind === "create") {
      if (like) {
        void api.connect(card.c.userId);
        void api.logMatchFeedback(card.c.userId, "connect", "spark");
        showToast(`Connection sent to ${card.c.username ?? "creator"}`);
      } else {
        void api.logMatchFeedback(card.c.userId, "pass", "spark");
      }
    } else {
      const result = await api.sparkAct(card.c.userId, like ? "like" : "pass", deckMode === "meetup" ? "meetup" : "love");
      if (like && result.mutual) {
        setCelebration({
          peerId: card.c.userId,
          peerName: card.c.username,
          deck: deckMode === "meetup" ? "meetup" : "love",
        });
      } else if (like) {
        showToast(`Liked ${card.c.username ?? "them"}`);
      }
    }
    busy.current = false;
  }, [showToast, deckMode]);

  async function blockCurrent() {
    const card = deck[idx];
    if (!card) return;
    const id = card.kind === "create" ? card.c.userId : card.c.userId;
    await api.blockUser(id);
    showToast("Blocked");
    setIdx((i) => i + 1);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-1 pt-2">
        <NetworkModes />
        <div className="mb-2 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {([
            { id: "create" as const, label: "Create", icon: Music2 },
            { id: "meetup" as const, label: "Meetup", icon: Footprints },
            { id: "love" as const, label: "Love", icon: Heart },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={deckMode === t.id}
              onClick={() => setDeckMode(t.id)}
              className={cx(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition",
                deckMode === t.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        {showFilters && deckMode === "create" && (
          <MatchHardFiltersPanel filters={createFilters} onChange={updateCreateFilters} />
        )}
        {showFilters && deckMode !== "create" && (
          <LoveMeetupFiltersPanel deck={deckMode} filters={vibeFilters} onChange={updateVibeFilters} />
        )}
      </div>

      <div className="relative flex-1 px-4 pb-6 pt-1">
        {romanticBlocked ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Heart className="mb-3 h-8 w-8 text-feel" />
            <h2 className="font-display text-lg font-bold text-white">18+ for romantic intents</h2>
            <p className="mt-1.5 max-w-xs text-sm text-white/55">
              Add your birth year on your profile before using Dating / Something casual on Spark.
            </p>
            <button type="button" onClick={() => navigate("/profile/edit")} className="btn btn-primary mt-5 px-5 text-xs">
              Open profile
            </button>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : idx >= deck.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-veil-200" />
            <h2 className="font-display text-lg font-bold text-white">
              {activeCount > 0 && deck.length === 0 ? "No cards with these filters" : "You're all caught up"}
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-white/55">
              {deckMode === "create"
                ? "Add roles you offer and seek so complementary creators surface."
                : "Share interests, meetup vibes, and looking-for on your profile to refill the deck."}
            </p>
            <button type="button" onClick={() => void load()} className="btn btn-ghost mt-5 px-5 text-xs">Refresh</button>
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-sm">
            <AnimatePresence>
              {deck.slice(idx, idx + 2).reverse().map((card) => {
                const id = card.kind === "create" ? card.c.userId : card.c.userId;
                const depth = deck.findIndex((d) => (d.kind === "create" ? d.c.userId : d.c.userId) === id) - idx;
                return card.kind === "create" ? (
                  <CreateSparkCard
                    key={`c-${id}`}
                    c={card.c}
                    depth={depth}
                    onAct={(like) => void act(card, like)}
                    onOpen={() => navigate(`/u/${id}`)}
                    onReport={() => setReportId(id)}
                    onBlock={() => void blockCurrent()}
                  />
                ) : (
                  <VibeSparkCard
                    key={`v-${id}`}
                    c={card.c}
                    depth={depth}
                    deck={deckMode === "meetup" ? "meetup" : "love"}
                    onAct={(like) => void act(card, like)}
                    onOpen={() => navigate(`/u/${id}`)}
                    onReport={() => setReportId(id)}
                    onBlock={() => void blockCurrent()}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {celebration && (
        <MutualMatchCelebration
          peerId={celebration.peerId}
          peerName={celebration.peerName}
          deck={celebration.deck}
          onClose={() => setCelebration(null)}
        />
      )}
      {reportId && (
        <ReportModal open onClose={() => setReportId(null)} targetKind="user" targetId={reportId} />
      )}
    </div>
  );
}

function SafetyChrome({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) {
  return (
    <div className="absolute right-3 top-3 z-[3] flex gap-1">
      <button type="button" onClick={onReport} aria-label="Report" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm active:scale-90">
        <Flag className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onBlock} aria-label="Block" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm active:scale-90">
        <Ban className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function VibeSparkCard({
  c, depth, deck, onAct, onOpen, onReport, onBlock,
}: {
  c: VibeMatch; depth: number; deck: "love" | "meetup";
  onAct: (like: boolean) => void; onOpen: () => void; onReport: () => void; onBlock: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const likeOp = useTransform(x, [20, 130], [0, 1]);
  const passOp = useTransform(x, [-130, -20], [1, 0]);
  const active = depth === 0;
  const name = c.username || "Someone";
  const meta = [c.age != null ? String(c.age) : null, c.sex, c.location].filter(Boolean).join(" · ");

  function onEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 700) onAct(info.offset.x > 0);
  }

  return (
    <motion.div className="absolute inset-0 touch-none" style={{ x: active ? x : 0, rotate: active ? rotate : 0, zIndex: 10 - depth }}
      drag={active ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={onEnd}
      initial={false} animate={{ scale: 1 - depth * 0.04, y: depth * 14 }}
      exit={{ x: (x.get() >= 0 ? 1 : -1) * 600, opacity: 0, transition: { duration: 0.32 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="match-bloom relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[var(--mat-depth)]" style={{ background: gradientFor(c.userId) }}>
        {active && <SafetyChrome onReport={onReport} onBlock={onBlock} />}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4 opacity-20">
          <span className="font-display text-[10rem] font-black leading-none text-white">{name.charAt(0).toUpperCase()}</span>
        </div>
        {active && <>
          <motion.div style={{ opacity: likeOp, rotate: -12 }} className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase text-feel">
            <Heart className="h-6 w-6" /> Like
          </motion.div>
          <motion.div style={{ opacity: passOp, rotate: 12 }} className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-white/50 px-4 py-2 font-display text-2xl font-bold uppercase text-white/70">
            <X className="h-6 w-6" /> Pass
          </motion.div>
        </>}
        <div className="relative mt-auto flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pb-28 pt-16">
          <div className="flex items-end justify-between gap-2">
            <button type="button" onClick={onOpen} className="text-left font-display text-2xl font-bold text-white">{name}</button>
            <span className="rounded-full border border-cyan-300/30 bg-black/35 px-2.5 py-0.5 font-display text-sm font-semibold text-cyan-100">
              {Math.round(c.fit * 100)}% fit
            </span>
          </div>
          {meta && <p className="flex items-center gap-1 text-xs text-white/55"><MapPin className="h-3.5 w-3.5" />{meta}</p>}
          {c.why && <p className="text-sm text-white/75">{c.why}</p>}
          {c.sharedMeetup.length > 0 && (
            <p className="text-xs"><span className="text-white/45">Meetup:</span> <span className="font-semibold text-aqua-200">{c.sharedMeetup.join(" · ")}</span></p>
          )}
          {c.sharedLooking.length > 0 && (
            <p className="text-xs"><span className="text-white/45">Looking for:</span> <span className="font-semibold text-feel">{c.sharedLooking.join(" · ")}</span></p>
          )}
          {c.sharedInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.sharedInterests.slice(0, 4).map((g) => (
                <span key={g} className="rounded-full bg-veil-500/30 px-2.5 py-1 text-[11px] font-medium text-white">{g}</span>
              ))}
            </div>
          )}
          {c.mutualLike && (
            <span className="w-fit rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel">Liked you</span>
          )}
        </div>
        {active && (
          <div className="absolute inset-x-0 bottom-0 z-[2] flex translate-y-1/2 flex-col items-center gap-3">
            <FreeConnectActions peerId={c.userId} peerName={c.username} variant="spark" />
            <div className="flex items-center justify-center gap-5">
              <button type="button" onClick={() => onAct(false)} aria-label="Pass" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-ink-950/90 text-white/70 shadow-[var(--mat-specular),var(--mat-depth)] active:scale-90"><X className="h-6 w-6" /></button>
              <button type="button" onClick={() => onAct(true)} aria-label="Like" className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-gradient-to-b from-emerald-300 to-teal-400 text-ink-950 shadow-[0_12px_32px_-12px_rgba(52,245,160,0.75)] active:scale-90">
                {deck === "meetup" ? <Footprints className="h-7 w-7" /> : <Heart className="h-7 w-7" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CreateSparkCard({
  c, depth, onAct, onOpen, onReport, onBlock,
}: {
  c: CollabMatch; depth: number;
  onAct: (like: boolean) => void; onOpen: () => void; onReport: () => void; onBlock: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const connectOp = useTransform(x, [20, 130], [0, 1]);
  const passOp = useTransform(x, [-130, -20], [1, 0]);
  const active = depth === 0;
  const name = c.username || "Creator";

  function onEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 700) onAct(info.offset.x > 0);
  }
  return (
    <motion.div className="absolute inset-0 touch-none" style={{ x: active ? x : 0, rotate: active ? rotate : 0, zIndex: 10 - depth }}
      drag={active ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={onEnd}
      initial={false} animate={{ scale: 1 - depth * 0.04, y: depth * 14 }}
      exit={{ x: (x.get() >= 0 ? 1 : -1) * 600, opacity: 0, transition: { duration: 0.32 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="match-bloom relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[var(--mat-depth)]" style={{ background: gradientFor(c.userId) }}>
        {active && <SafetyChrome onReport={onReport} onBlock={onBlock} />}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4 opacity-20"><span className="font-display text-[10rem] font-black leading-none text-white">{name.charAt(0).toUpperCase()}</span></div>
        {active && <>
          <motion.div style={{ opacity: connectOp, rotate: -12 }} className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase text-feel"><UserPlus className="h-6 w-6" /> Connect</motion.div>
          <motion.div style={{ opacity: passOp, rotate: 12 }} className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-white/50 px-4 py-2 font-display text-2xl font-bold uppercase text-white/70"><X className="h-6 w-6" /> Pass</motion.div>
        </>}
        <div className="relative mt-auto flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pb-28 pt-16">
          <div className="flex items-end justify-between gap-2">
            <button type="button" onClick={onOpen} className="font-display text-2xl font-bold text-white">{name}</button>
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
          <div className="absolute inset-x-0 bottom-0 z-[2] flex translate-y-1/2 flex-col items-center gap-3">
            <FreeConnectActions peerId={c.userId} peerName={c.username} variant="spark" />
            <div className="flex items-center justify-center gap-5">
              <button type="button" onClick={() => onAct(false)} aria-label="Pass" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-ink-950/90 text-white/70 shadow-[var(--mat-specular),var(--mat-depth)] active:scale-90"><X className="h-6 w-6" /></button>
              <button type="button" onClick={() => onAct(true)} aria-label="Connect" className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-gradient-to-b from-emerald-300 to-teal-400 text-ink-950 shadow-[0_12px_32px_-12px_rgba(52,245,160,0.75)] active:scale-90"><UserPlus className="h-7 w-7" /></button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
