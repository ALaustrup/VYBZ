import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Crown,
  ImagePlus,
  Loader2,
  LogOut,
  Plus,
  Send,
  Settings,
  Shield,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { Handle } from "@/components/Handle";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { Skeleton } from "@/components/Skeleton";
import { TipButton } from "@/components/TipButton";
import { processImage } from "@/lib/media";
import { circleGradient, CIRCLE_THEMES } from "@/lib/cosmetics";
import { Coins } from "lucide-react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cx, timeAgo } from "@/lib/utils";
import type { Circle, CircleMember, CircleMessage, RoomPresence } from "@/types";

export function CircleChatPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { account, profileId, showToast, nsfwOptIn, report, nsfwEligible } = useApp();
  // Two-column (chat + members) when there's room for it (landscape / wide).
  const wide = useMediaQuery("(min-width: 768px)");

  const [circle, setCircle] = useState<Circle | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [people, setPeople] = useState<RoomPresence[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPeople, setShowPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [supporter, setSupporter] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [typer, setTyper] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const typingRef = useRef<{ notify: () => void; unsub: () => void } | null>(null);
  const lastTyped = useRef(0);
  const typerTimer = useRef<number | undefined>(undefined);

  const isAnon = !!account?.anonymous;
  const isOwner = role === "owner";
  const isMod = role === "owner" || role === "mod";
  const isMember = role === "owner" || role === "mod" || role === "member";
  const canChat = circle ? (!isAnon || circle.allowAnonymous) : false;

  const reload = () => {
    void backend.fetchCircle(id).then(setCircle);
      if (profileId)
      void backend.fetchMembership(id, profileId).then((m) => {
        setRole(m?.status === "active" ? m.role : null);
        setPending(m?.status === "pending");
        setSupporter(!!m?.supporter);
      });
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      const c = await backend.fetchCircle(id);
      setCircle(c);
      if (profileId) {
        const m = await backend.fetchMembership(id, profileId);
        setRole(m?.status === "active" ? m.role : null);
        setPending(m?.status === "pending");
        setSupporter(!!m?.supporter);
        // Charge today's dues for active supporters (never blocks chat).
        if (m?.status === "active" && (c?.dues ?? 0) > 0 && m.supporter) {
          const r = await backend.payCircleDues(id);
          if (r === "insufficient") {
            setSupporter(false);
            showToast("Support paused — not enough V¢ today.");
          }
        }
      }
      setMessages(await backend.fetchCircleMessages(id, profileId));
      setLoading(false);
    })();
    const unsub = backend.subscribeCircleMessages(
      id,
      profileId,
      (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      (mid, hidden) => {
        if (hidden) setMessages((prev) => prev.filter((x) => x.id !== mid));
      }
    );
    let leave = () => {};
    if (profileId && account) {
      leave = backend.joinCirclePresence(
        id,
        { id: profileId, alias: account.alias, aura: account.aura },
        setPeople
      );
      typingRef.current = backend.circleTyping(
        id,
        { id: profileId, alias: account.alias },
        (who) => {
          if (who.id === profileId) return;
          setTyper(who.alias);
          window.clearTimeout(typerTimer.current);
          typerTimer.current = window.setTimeout(() => setTyper(null), 3000);
        }
      );
    }
    return () => {
      unsub();
      leave();
      typingRef.current?.unsub();
      window.clearTimeout(typerTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profileId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending || !circle || !account || !profileId) return;
    setSending(true);
    const ok = await backend.sendCircleMessage({
      circleId: id,
      body,
      alias: account.alias,
      aura: account.aura,
    });
    setSending(false);
    if (ok) setText("");
    else showToast(canChat ? "Couldn't send." : "Anonymous chat is off in this circle.");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !account || !profileId) return;
    try {
      // Chat images stay modest (2K) for fast sends and the public bucket cap.
      const out = await processImage(file, 2160, 0.88);
      const url = await backend.uploadPublicMedia(out.dataUrl, profileId);
      if (!url) return;
      const nsfw = await backend.moderateImage(url);
      await backend.sendCircleMessage({ circleId: id, imageUrl: url, nsfw, alias: account.alias, aura: account.aura });
    } catch {
      showToast("Couldn't share that image.");
    }
  }

  async function join(code?: string) {
    const status = await backend.joinCircle(id, code);
    if (status === "joined") {
      showToast("Joined!");
      setShowCode(false);
      reload();
    } else if (status === "pending") {
      showToast("Request sent — awaiting approval.");
      setPending(true);
    } else if (status === "bad_code") {
      showToast("That code didn't work.");
    } else if (status === "banned") {
      showToast("You can't join this circle.");
    }
  }

  async function toggleSupport() {
    const next = !supporter;
    setSupporter(next);
    await backend.setCircleSupport(id, next);
    if (next) {
      const r = await backend.payCircleDues(id);
      if (r === "insufficient") {
        setSupporter(false);
        showToast("Not enough V¢ to support today.");
      } else showToast(`Supporting · ${circle?.dues} V¢/day ✨`);
    }
  }

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTyped.current > 1400) {
      lastTyped.current = now;
      typingRef.current?.notify();
    }
  }
  async function leave() {
    await backend.leaveCircle(id);
    showToast("Left the circle.");
    setRole(null);
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
        <div className="flex-1 space-y-3 px-4 py-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={cx("flex", i % 2 === 0 ? "" : "justify-end")}>
              <Skeleton className={cx("h-10 rounded-2xl", i % 2 === 0 ? "w-1/2" : "w-2/5")} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!circle) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-sm text-white/55">This circle has dissolved.</p>
        <button onClick={() => navigate("/circles")} className="text-sm font-semibold text-veil-300">Back to Circles</button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b border-white/8 px-4 py-3"
        style={circleGradient(circle.theme) ? { background: circleGradient(circle.theme) } : undefined}
      >
        <button onClick={() => navigate("/chat")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-veil-500/20 text-xl">{circle.icon || "🌀"}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-white">
            {circle.name}
            {circle.nsfw && <span className="ml-1.5 rounded-full bg-wild/80 px-1.5 py-0.5 text-[9px] font-bold text-white align-middle">18+</span>}
          </p>
          <button
            onClick={() => !isAnon && setShowPeople((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-white/45"
          >
            <Users className="h-3 w-3" />
            {isAnon ? `${people.length} chatting now` : `${circle.memberCount} members · ${people.length} here`}
          </button>
        </div>
        {!isOwner && <TipButton toUserId={circle.ownerId} reff={`circle:${circle.id}`} compact />}
        {isOwner && (
          <button onClick={() => setShowSettings(true)} aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
            <Settings className="h-4 w-4" />
          </button>
        )}
        {!isMember && !isAnon && pending && (
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/60">Requested</span>
        )}
        {!isMember && !isAnon && !pending && (
          circle.joinPolicy === "code" || circle.joinPolicy === "invite" ? (
            <button onClick={() => setShowCode((v) => !v)} className="rounded-full bg-veil-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95">
              Enter code
            </button>
          ) : (
            <button onClick={() => join()} className="rounded-full bg-veil-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95">
              {circle.joinPolicy === "request" ? "Request" : "Join"}
            </button>
          )
        )}
        {isMember && !isOwner && (
          <button onClick={leave} aria-label="Leave" className="flex h-9 w-9 items-center justify-center rounded-full glass text-white/50 active:scale-90">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* People (identity only) */}
      {showPeople && !isAnon && (
        <div className="border-b border-white/8 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-1 text-xs text-white/70">
                <Handle emoji={p.alias} size={12} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Support / dues */}
      {isMember && !isOwner && circle.dues > 0 && (
        <button
          onClick={toggleSupport}
          className={cx(
            "flex items-center justify-center gap-1.5 border-b border-white/8 px-4 py-2 text-xs font-semibold",
            supporter ? "bg-amber-300/10 text-amber-200" : "text-white/55"
          )}
        >
          <Coins className="h-3.5 w-3.5" />
          {supporter ? `Supporting · ${circle.dues} V¢/day` : `Support this circle · ${circle.dues} V¢/day`}
        </button>
      )}

      {/* Join-by-code entry */}
      {showCode && !isMember && (
        <div className="flex gap-2 border-b border-white/8 px-4 py-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Invite code"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm uppercase text-white placeholder:text-white/30 focus:outline-none"
          />
          <button onClick={() => join(codeInput.trim())} className="rounded-xl bg-veil-500 px-4 text-sm font-semibold text-white active:scale-95">
            Join
          </button>
        </div>
      )}

      {/* Chat + (landscape) members sidebar. */}
      <div className={cx("flex min-h-0 flex-1", !wide && "flex-col")}>
        <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div ref={scroller} className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const hidden = !!m.imageUrl && !!m.nsfw && !nsfwOptIn && !revealed.includes(m.id);
          return (
            <div key={m.id} className={cx("flex gap-2", m.mine && "flex-row-reverse")}>
              {!m.mine && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-veil-500/20 font-display text-[11px] font-bold text-veil-100">
                  {(m.alias || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className={cx("max-w-[78%] rounded-2xl px-3 py-2", m.mine ? "bg-veil-500/30" : "bg-white/[0.05]")}>
                {!m.mine && (
                  <div className="mb-0.5">
                    <Handle emoji={m.alias} size={12} className="text-[11px] text-white/60" />
                  </div>
                )}
                {m.imageUrl && (
                  <button onClick={() => setRevealed((r) => [...r, m.id])} className="relative mb-1 block h-40 w-48 overflow-hidden rounded-xl">
                    <VeiledPhoto src={m.imageUrl} level={hidden ? 0.06 : 1} nsfw={hidden} />
                    {hidden && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80">Tap to unveil</span>}
                  </button>
                )}
                {m.body && <p className="text-sm leading-snug text-white/90">{m.body}</p>}
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[9px] text-white/30">{timeAgo(m.createdAt)}</span>
                  {!m.mine && (
                    <button onClick={() => { report("message", m.id, "circle message"); showToast("Reported."); }} className="text-[9px] text-white/30 underline">
                      report
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {typer && (
        <div className="px-4 pb-1 text-[11px] italic text-white/40">someone is typing…</div>
      )}

      {/* Composer */}
      <div className="border-t border-white/8 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {circle.nsfw && !nsfwEligible ? (
          <p className="py-2 text-center text-xs text-white/55">This is an 18+ circle. Verify your account (Settings → sensitive content) to enter.</p>
        ) : !canChat ? (
          <p className="py-2 text-center text-xs text-white/45">The owner has turned off anonymous chat here. Create an identity to join the conversation.</p>
        ) : (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} aria-label="Share image" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass text-white/60 active:scale-90">
              <ImagePlus className="h-5 w-5" />
            </button>
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Say something…"
              className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <button onClick={send} disabled={sending || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90 disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
        </div>

        {/* Landscape members sidebar (identity only; never for anonymous). */}
        {wide && !isAnon && (
          <aside className="no-scrollbar w-64 shrink-0 overflow-y-auto border-l border-white/8 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
              Here now · {people.length}
            </p>
            <div className="space-y-1.5">
              {people.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 text-xs text-white/75"
                >
                  <Handle emoji={p.alias} size={13} />
                </span>
              ))}
            </div>
          </aside>
        )}
      </div>

      {showSettings && isOwner && (
        <CircleSettings circle={circle} onClose={() => setShowSettings(false)} onSaved={reload} showToast={showToast} isMod={isMod} />
      )}
    </div>
  );
}

function CircleSettings({
  circle,
  onClose,
  onSaved,
  showToast,
}: {
  circle: Circle;
  onClose: () => void;
  onSaved: () => void;
  showToast: (t: string) => void;
  isMod: boolean;
}) {
  const { isPremium, nsfwEligible, showToast: toast } = useApp();
  const [allowAnon, setAllowAnon] = useState(circle.allowAnonymous);
  const [nsfw, setNsfw] = useState(circle.nsfw);
  const [desc, setDesc] = useState(circle.description ?? "");
  const [rules, setRules] = useState(circle.rules ?? "");
  const [name, setName] = useState(circle.name);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [visibility, setVisibility] = useState(circle.visibility);
  const [joinPolicy, setJoinPolicy] = useState(circle.joinPolicy);
  const [code, setCode] = useState<string | null>(null);
  const [dues, setDues] = useState(String(circle.dues || 0));
  const [themeId, setThemeId] = useState(circle.theme?.id || "");
  const [slug, setSlug] = useState(circle.slug ?? "");

  useEffect(() => {
    void backend.fetchCircleMembers(circle.id).then(setMembers);
    void backend.getCircleCode(circle.id).then(setCode);
  }, [circle.id]);

  const pendingMembers = members.filter((m) => m.status === "pending");
  const activeMembers = members.filter((m) => m.status !== "pending");

  async function saveAccess(regen: boolean) {
    const c = await backend.setCircleAccess(circle.id, visibility, joinPolicy, regen);
    setCode(c);
    showToast("Access updated.");
  }
  async function approve(userId: string, ok: boolean) {
    await backend.approveCircleMember(circle.id, userId, ok);
    setMembers(await backend.fetchCircleMembers(circle.id));
  }

  async function save() {
    try {
      await backend.updateCircleSettings({
        circleId: circle.id,
        description: desc,
        icon: circle.icon,
        rules,
        allowAnonymous: allowAnon,
        nsfw,
      });
    } catch {
      toast("Verify your account (18+) before making an adult circle.");
      setNsfw(false);
    }
    await backend.setCircleDues(circle.id, Math.max(0, Math.min(50, parseInt(dues, 10) || 0)));
    await backend.setCircleTheme(circle.id, themeId ? { id: themeId } : {});
    if (isPremium && slug.trim() && slug.trim() !== circle.slug) {
      const ok = await backend.setCircleSlug(circle.id, slug.trim());
      if (!ok) toast("That custom link is taken or invalid.");
    }
    if (name.trim() && name.trim() !== circle.name) {
      const ok = await backend.renameCircle(circle.id, name.trim());
      toast(ok ? "Saved (name changed — one-time used)." : "Saved. Name can only change once.");
    } else {
      toast("Saved.");
    }
    onSaved();
    onClose();
  }

  async function moderate(userId: string, status: string | null, role: string | null) {
    await backend.setCircleMember(circle.id, userId, status, role);
    setMembers(await backend.fetchCircleMembers(circle.id));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="no-scrollbar max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Circle settings</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
        </div>

        {/* Unveil Anonymous toggle */}
        <button
          onClick={() => setAllowAnon((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-white">{allowAnon ? "Anonymous chat on" : "Anonymous chat off"}</p>
            <p className="text-xs text-white/45">{allowAnon ? "Anonymous users can chat here." : "Anonymous users can read but not chat."}</p>
          </div>
          <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", allowAnon ? "bg-veil-500" : "bg-white/15")}>
            <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", allowAnon ? "left-[22px]" : "left-0.5")} />
          </span>
        </button>

        {/* 18+ toggle */}
        <button
          onClick={() => {
            if (!nsfw && !nsfwEligible) { toast("Verify your account (18+) first in Settings."); return; }
            setNsfw((v) => !v);
          }}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-white">18+ adult circle</p>
            <p className="text-xs text-white/45">Only verified adults can enter.</p>
          </div>
          <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", nsfw ? "bg-wild" : "bg-white/15")}>
            <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", nsfw ? "left-[22px]" : "left-0.5")} />
          </span>
        </button>

        {/* Daily dues (opt-in support) */}
        <label className="mb-1 block text-xs font-semibold text-white/55">Daily dues (V¢ · 0 = off)</label>
        <input
          value={dues}
          onChange={(e) => setDues(e.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          placeholder="0"
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30"
        />

        {/* Theme */}
        <label className="mb-1 block text-xs font-semibold text-white/55">Theme</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {CIRCLE_THEMES.map((t) => {
            const locked = t.premium && !isPremium;
            return (
              <button
                key={t.id}
                onClick={() => !locked && setThemeId(t.id)}
                disabled={locked}
                className={cx(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  themeId === t.id ? "border-veil-400/60 text-white" : "border-white/10 text-white/55",
                  locked && "opacity-40"
                )}
                style={t.gradient ? { background: t.gradient } : undefined}
              >
                {t.name}{locked ? " 🔒" : ""}
              </button>
            );
          })}
        </div>

        {/* Vanity slug (Godmode) */}
        {isPremium && (
          <>
            <label className="mb-1 block text-xs font-semibold text-amber-300/70">Vanity handle (Godmode)</label>
            <div className="mb-3 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3">
              <span className="text-xs text-white/35">@</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-circle" className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" />
            </div>
          </>
        )}

        <label className="mb-1 block text-xs font-semibold text-white/55">Name {circle.nameChangesRemaining > 0 ? "(one change left)" : "(locked)"}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          disabled={circle.nameChangesRemaining <= 0}
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white disabled:opacity-50"
        />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 160))} rows={2} placeholder="Description" className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30" />
        <textarea value={rules} onChange={(e) => setRules(e.target.value.slice(0, 400))} rows={2} placeholder="Rules (optional)" className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30" />

        <button onClick={save} className="mb-4 w-full rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow active:scale-95">Save</button>

        {/* Access */}
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Access</p>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Circle["visibility"])} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white">
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
            <option value="secret">Secret</option>
          </select>
          <select value={joinPolicy} onChange={(e) => setJoinPolicy(e.target.value as Circle["joinPolicy"])} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white">
            <option value="open">Anyone can join</option>
            <option value="request">Request to join</option>
            <option value="code">Join with code</option>
          </select>
        </div>
        <div className="mb-2 flex gap-2">
          <button onClick={() => saveAccess(false)} className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-white/70 active:scale-95">Apply access</button>
          {(joinPolicy === "code" || joinPolicy === "invite") && (
            <button onClick={() => saveAccess(true)} className="flex-1 rounded-xl bg-veil-500/20 py-2 text-xs font-semibold text-veil-100 active:scale-95">
              {code ? `Code: ${code}` : "Generate code"}
            </button>
          )}
        </div>

        {/* Requests */}
        {pendingMembers.length > 0 && (
          <>
            <p className="mb-2 mt-3 text-[11px] uppercase tracking-wider text-amber-300/70">Requests ({pendingMembers.length})</p>
            <ul className="mb-3 space-y-1.5">
              {pendingMembers.map((m) => (
                <li key={m.userId} className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2">
                  <Handle username={m.username} emoji={m.alias} size={14} />
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => approve(m.userId, true)} className="rounded-full bg-feel/20 px-3 py-1 text-xs font-semibold text-feel active:scale-95">Approve</button>
                    <button onClick={() => approve(m.userId, false)} className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/50 active:scale-95">Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Members */}
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Members ({activeMembers.length})</p>
        <ul className="space-y-1.5">
          {activeMembers.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <Handle username={m.username} emoji={m.alias} size={14} />
              {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-300" />}
              {m.role === "mod" && <Shield className="h-3.5 w-3.5 text-veil-300" />}
              {m.status !== "active" && <span className="text-[10px] text-wild">{m.status}</span>}
              {m.role !== "owner" && (
                <div className="ml-auto flex gap-1">
                  <button onClick={() => moderate(m.userId, m.status === "muted" ? "active" : "muted", null)} aria-label="Mute" className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 active:scale-90"><VolumeX className="h-3.5 w-3.5" /></button>
                  <button onClick={() => moderate(m.userId, m.status === "banned" ? "active" : "banned", null)} aria-label="Ban" className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 active:scale-90 hover:text-wild"><Ban className="h-3.5 w-3.5" /></button>
                  <button onClick={() => moderate(m.userId, null, m.role === "mod" ? "member" : "mod")} aria-label="Toggle mod" className={cx("flex h-7 w-7 items-center justify-center rounded-full active:scale-90", m.role === "mod" ? "text-veil-300" : "text-white/40")}><Plus className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
