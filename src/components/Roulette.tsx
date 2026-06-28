import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Flame, Loader2, Send, Shuffle, SkipForward, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { VerifyGate } from "@/components/VerifyGate";
import { cx, haptic } from "@/lib/utils";
import { playSound } from "@/lib/sound";

type Phase = "intro" | "ineligible" | "searching" | "chatting";

/** Adult-lane conversation intents. Purely a vibe the user signals up front. */
const NSFW_INTENTS = ["Sext", "Role Play", "Show-n-Tell"] as const;
type NsfwIntent = (typeof NSFW_INTENTS)[number];

interface Line {
  mine: boolean;
  text: string;
  t: number;
}

// Skip becomes available after a short dwell — Godmode skips sooner.
const SKIP_MS = 10_000;
const SKIP_MS_GODMODE = 3_000;
const POLL_MS = 3_000;
const MAX_LEN = 300;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * MYVYB Roulette — random 1:1 ephemeral text chat. Matchmaking and the
 * age-layer rule are enforced server-side; messages are broadcast-only (never
 * stored); links are stripped; report/skip are always one tap away.
 */
export function Roulette() {
  const { profileId, isPremium, showToast, nsfwEligible } = useApp();
  const [phase, setPhase] = useState<Phase>("intro");
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [partnerHandle, setPartnerHandle] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [skipIn, setSkipIn] = useState(0);
  const [online, setOnline] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  // Adult lane: separate, opt-in pool matched only with other verified adults.
  const [nsfw, setNsfw] = useState(false);
  const [intent, setIntent] = useState<NsfwIntent>("Sext");
  const [nsfwGateOpen, setNsfwGateOpen] = useState(false);
  const nsfwRef = useRef(false);
  nsfwRef.current = nsfw;

  const room = useRef<{ send: (t: string) => void; leave: (announce?: boolean) => void } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const matchUnsub = useRef<(() => void) | null>(null);
  const pollRef = useRef<number | null>(null);
  const startedAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipDelay = isPremium ? SKIP_MS_GODMODE : SKIP_MS;

  const stopSearching = useCallback(() => {
    matchUnsub.current?.();
    matchUnsub.current = null;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const teardownRoom = useCallback((announce: boolean) => {
    room.current?.leave(announce);
    room.current = null;
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) void backend.rouletteEnd(s);
  }, []);

  const enterChat = useCallback(
    async (match: backend.RouletteMatch) => {
      if (sessionRef.current === match.sessionId) return; // already here
      stopSearching();
      sessionRef.current = match.sessionId;
      setPartnerId(match.partnerId);
      setLines([]);
      setDraft("");
      startedAt.current = Date.now();
      setSkipIn(Math.ceil(skipDelay / 1000));
      setPhase("chatting");
      playSound("notify");
      haptic(12);

      room.current = backend.joinRouletteRoom(
        match.sessionId,
        profileId ?? "me",
        (m) => {
          setLines((prev) => [...prev, { mine: false, text: m.text, t: m.t }]);
          playSound("message", { volume: 0.6 });
        },
        () => {
          // Partner left → find someone new.
          showToast("Stranger disconnected — finding someone new…");
          teardownRoom(false);
          void begin();
        }
      );

      // Resolve the partner's username (best-effort, stays anonymous otherwise).
      const p = await backend.fetchPublicProfile(match.partnerId);
      setPartnerHandle(p?.username ?? p?.alias ?? "Stranger");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileId, skipDelay, showToast, stopSearching, teardownRoom]
  );

  const begin = useCallback(async () => {
    setPhase("searching");
    const r = await backend.rouletteEnqueue(nsfwRef.current);
    if (!r.eligible) {
      stopSearching();
      setPhase("ineligible");
      return;
    }
    if (r.match) {
      void enterChat(r.match);
      return;
    }
    // Waiting: listen for an instant match + poll as a self-healing fallback.
    matchUnsub.current?.();
    matchUnsub.current = backend.subscribeRouletteMatch(profileId ?? "", (m) => void enterChat(m));
    if (!pollRef.current) {
      pollRef.current = window.setInterval(async () => {
        if (sessionRef.current) return;
        const active = await backend.fetchActiveRoulette(profileId ?? "");
        if (active) {
          void enterChat(active);
          return;
        }
        const again = await backend.rouletteEnqueue(nsfwRef.current);
        if (again.match) void enterChat(again.match);
      }, POLL_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, enterChat, stopSearching]);

  const skip = useCallback(() => {
    haptic(10);
    teardownRoom(true);
    setPartnerHandle("");
    setPartnerId("");
    void begin();
  }, [begin, teardownRoom]);

  const stop = useCallback(() => {
    teardownRoom(true);
    stopSearching();
    void backend.rouletteCancel();
    setPhase("intro");
    setPartnerHandle("");
  }, [teardownRoom, stopSearching]);

  const report = useCallback(() => {
    if (partnerId && profileId) {
      void backend.reportContent(profileId, "profile", partnerId, "roulette");
      void backend.blockUser(profileId, partnerId);
      showToast("Reported. You won't be matched again.");
    }
    skip();
  }, [partnerId, profileId, showToast, skip]);

  function send() {
    const clean = draft.trim().replace(URL_RE, "[link removed]").slice(0, MAX_LEN);
    if (!clean || !room.current) return;
    room.current.send(clean);
    setLines((prev) => [...prev, { mine: true, text: clean, t: Date.now() }]);
    setDraft("");
  }

  // Countdown until Skip is allowed.
  useEffect(() => {
    if (phase !== "chatting") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, skipDelay - (Date.now() - startedAt.current));
      setSkipIn(Math.ceil(left / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [phase, skipDelay]);

  // Auto-scroll to newest line.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // Show how many people are in the Random lobby right now.
  useEffect(() => {
    if (!profileId) return;
    const leave = backend.joinRoulettePresence(profileId, setOnline);
    return leave;
  }, [profileId]);

  // Full cleanup when leaving the page.
  useEffect(() => {
    return () => {
      room.current?.leave(true);
      const s = sessionRef.current;
      if (s) void backend.rouletteEnd(s);
      void backend.rouletteCancel();
      matchUnsub.current?.();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (phase === "ineligible") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <Shuffle className="mb-3 h-8 w-8 text-veil-300" />
        <h3 className="font-display text-lg font-bold text-white">
          Verify to start random chat
        </h3>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/55">
          Random chat needs a verified email and your (permanent) age and sex, so
          it can match you safely within your own age layer (13–17 with 13–17, 18+
          with 18+).
        </p>
        <button
          onClick={() => setGateOpen(true)}
          className="mt-5 rounded-full bg-veil-500 px-6 py-2.5 text-sm font-semibold text-white shadow-glow active:scale-95"
        >
          Verify &amp; set up
        </button>
        <button onClick={() => setPhase("intro")} className="mt-3 text-xs text-white/40">
          Back
        </button>
        <VerifyGate
          mode="chat"
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          onComplete={() => {
            setGateOpen(false);
            setPhase("intro");
            void begin();
          }}
        />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-veil-500/15 ring-1 ring-veil-400/30">
          <Shuffle className="h-8 w-8 text-veil-200" />
        </div>
        <h3 className="font-display text-xl font-bold text-gradient">Random</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
          Get matched with a random person online for a one-on-one chat. Skip
          anytime to meet someone new. Text only — be kind, stay anonymous.
        </p>

        {/* Lane selector: friendly vs the adults-only 18+ pool. */}
        <div className="mt-5 flex w-full max-w-xs gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setNsfw(false)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition",
              !nsfw ? "bg-veil-500 text-white shadow-glow" : "text-white/55"
            )}
          >
            <Shuffle className="h-4 w-4" /> Friendly
          </button>
          <button
            onClick={() => {
              if (nsfwEligible) setNsfw(true);
              else setNsfwGateOpen(true);
            }}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition",
              nsfw ? "bg-wild text-white shadow-glow-wild" : "text-white/55"
            )}
          >
            <Flame className="h-4 w-4" /> 18+
          </button>
        </div>

        {nsfw ? (
          <>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-wild/80">
              What are you here for?
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {NSFW_INTENTS.map((it) => (
                <button
                  key={it}
                  onClick={() => setIntent(it)}
                  className={cx(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
                    intent === it
                      ? "border-wild/60 bg-wild/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55"
                  )}
                >
                  {it}
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-left text-xs text-white/45">
              <li>• Verified adults only (18+), matched in a separate pool.</li>
              <li>• Messages are never saved. Keep it consensual.</li>
              <li>• Report or skip instantly if anything feels off.</li>
            </ul>
          </>
        ) : (
          <ul className="mt-4 space-y-1.5 text-left text-xs text-white/45">
            <li>• You're only matched within your age layer.</li>
            <li>• Messages are never saved.</li>
            <li>• Report or skip instantly if anything feels off.</li>
          </ul>
        )}

        {online > 1 && (
          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-feel">
            <span className="h-1.5 w-1.5 rounded-full bg-feel" />
            {online} here now
          </p>
        )}
        <button
          onClick={() => {
            haptic(10);
            if (nsfw) setDraft(`Hey — up for some ${intent.toLowerCase()}?`);
            void begin();
          }}
          className={cx(
            "btn mt-6 rounded-full px-7 py-3.5",
            nsfw ? "btn-danger" : "btn-primary"
          )}
        >
          {nsfw ? <Flame className="h-5 w-5" /> : <Shuffle className="h-5 w-5" />}
          {nsfw ? "Start 18+ matching" : "Start matching"}
        </button>

        <VerifyGate
          mode="nsfw"
          open={nsfwGateOpen}
          onClose={() => setNsfwGateOpen(false)}
          onComplete={() => {
            setNsfwGateOpen(false);
            setNsfw(true);
          }}
        />
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-veil-300" />
        <h3 className="font-display text-lg font-bold text-white">Finding someone…</h3>
        <p className="mt-1.5 text-sm text-white/50">
          {online > 1
            ? `${online} people in the lobby — matching you now.`
            : "Matching you with another soul online."}
        </p>
        <button
          onClick={stop}
          className="mt-6 rounded-full bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-white/80 active:scale-95"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Chatting.
  const canSkip = skipIn <= 0;
  return (
    <div className="flex h-full min-h-[60vh] flex-col rounded-3xl border border-white/10 bg-ink-950/60">
      {/* Partner header. */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="flex h-2 w-2 rounded-full bg-feel" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
          {partnerHandle || "Stranger"}
        </span>
        {nsfw && (
          <span className="flex items-center gap-1 rounded-full bg-wild/20 px-2 py-0.5 text-[10px] font-bold text-wild">
            <Flame className="h-3 w-3" /> 18+
          </span>
        )}
        <button
          onClick={report}
          className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-wild active:scale-95"
        >
          <Flag className="h-3 w-3" /> Report
        </button>
        <button
          onClick={stop}
          aria-label="Leave"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-white/60 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages. */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {lines.length === 0 && (
          <p className="py-6 text-center text-xs text-white/35">
            You're connected. Say hi 👋
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className={cx("flex", l.mine ? "justify-end" : "justify-start")}>
            <span
              className={cx(
                "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                l.mine ? "bg-veil-500 text-white" : "bg-white/[0.06] text-white/85"
              )}
            >
              {l.text}
            </span>
          </div>
        ))}
      </div>

      {/* Composer + skip. */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            maxLength={MAX_LEN}
            placeholder="Message… (text only)"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-veil-400/50"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow transition active:scale-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={skip}
            disabled={!canSkip}
            className={cx(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95",
              canSkip ? "bg-white/[0.08] text-white/85" : "bg-white/[0.04] text-white/35"
            )}
          >
            <SkipForward className="h-4 w-4" />
            {canSkip ? "Skip" : skipIn}
          </button>
        </div>
      </div>
    </div>
  );
}
