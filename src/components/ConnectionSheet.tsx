import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  Check,
  Clock,
  EyeOff,
  Flag,
  Heart,
  MessagesSquare,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { CONFESSIONS } from "@/data/confessions";
import { IdentityMeta } from "@/components/IdentityMeta";
import { SafetyMenu } from "@/components/SafetyMenu";
import { Handle } from "@/components/Handle";
import { TipButton } from "@/components/TipButton";
import { VeiledArt } from "@/components/VeiledArt";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import {
  addBackendComment,
  fetchComments,
  fetchCommentTallies,
  isBackendId,
  subscribeComments,
  voteComment,
  type CommentTally,
} from "@/lib/backend";
import { cx, timeAgo } from "@/lib/utils";
import type { Comment, Confession } from "@/types";

/**
 * The social layer for a single confession: community comments only. Direct
 * messaging a poster from the feed has been removed — connection happens through
 * friending and matchmaking. Comments are public, votable (Vyb/Fail), and
 * reportable; one comment per person per post keeps the thread signal-rich.
 */
export function ConnectionSheet() {
  const {
    activeConnectionId,
    closeConnection,
    userConfessions,
    comments,
    addComment,
    hasCommented,
    friendStatus,
    requestFriend,
    acceptFriend,
    profileId,
    backendConfessions,
    showToast,
    report,
    displayLevel,
    isNsfwHidden,
    openPost,
  } = useApp();
  const dragControls = useDragControls();

  const [commentDraft, setCommentDraft] = useState("");
  const [backendComments, setBackendComments] = useState<Comment[]>([]);
  const [tallies, setTallies] = useState<Record<string, CommentTally>>({});
  const [revealedComment, setRevealedComment] = useState<string | null>(null);
  const [shownVeiled, setShownVeiled] = useState<Set<string>>(new Set());

  const confession: Confession | undefined = useMemo(() => {
    if (!activeConnectionId) return undefined;
    return (
      [...backendConfessions, ...userConfessions, ...CONFESSIONS].find(
        (c) => c.id === activeConnectionId
      ) ?? undefined
    );
  }, [activeConnectionId, userConfessions, backendConfessions]);

  const id = activeConnectionId ?? "";
  const isBackendConfession = isBackendId(id) && !!profileId;

  // Load + live-subscribe to backend comments (per-confession, no peer needed).
  useEffect(() => {
    if (!isBackendConfession || !profileId || !id) {
      setBackendComments([]);
      return;
    }
    let active = true;
    fetchComments(id, profileId).then((cs) => {
      if (active) setBackendComments(cs);
    });
    const unsub = subscribeComments(id, profileId, (c) => {
      setBackendComments((prev) =>
        prev.some((x) => x.id === c.id) ? prev : [...prev, c]
      );
    });
    return () => {
      active = false;
      unsub();
    };
  }, [isBackendConfession, profileId, id]);

  const commentList = isBackendConfession ? backendComments : comments[id] ?? [];
  const alreadyCommented = isBackendConfession
    ? backendComments.some((c) => c.mine)
    : hasCommented(id);

  // Community comment votes (Vyb boosts, Fail veils). Loaded when the sheet opens.
  useEffect(() => {
    if (!id) return;
    void fetchCommentTallies(id).then(setTallies);
  }, [id, commentList.length]);

  useEffect(() => {
    setCommentDraft("");
  }, [activeConnectionId]);

  function castCommentVote(c: Comment, reaction: "vyb" | "fail") {
    const cur = tallies[c.id] ?? { vybs: 0, fails: 0, mine: null };
    const next: "vyb" | "fail" | null = cur.mine === reaction ? null : reaction;
    const t: CommentTally = { vybs: cur.vybs, fails: cur.fails, mine: next };
    if (cur.mine === "vyb") t.vybs -= 1;
    if (cur.mine === "fail") t.fails -= 1;
    if (next === "vyb") t.vybs += 1;
    if (next === "fail") t.fails += 1;
    setTallies((prev) => ({ ...prev, [c.id]: t }));
    const commentUserId = c.id.split(":")[1];
    if (profileId && commentUserId && commentUserId.includes("-")) {
      void voteComment(id, commentUserId, profileId, next);
    }
  }

  function reportComment(c: Comment) {
    report("comment", c.id, "comment");
    setRevealedComment(null);
  }

  function submitComment() {
    const body = commentDraft.trim();
    if (!body) return;
    if (isBackendConfession) {
      void addBackendComment(id, profileId as string, body).then((ok) => {
        if (ok) setCommentDraft("");
        else showToast("You can only leave one comment per confession.");
      });
      return;
    }
    if (addComment(id, commentDraft)) setCommentDraft("");
  }

  return (
    <AnimatePresence>
      {confession && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConnection}
            className="fixed inset-0 z-[56] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) closeConnection();
            }}
            className="fixed inset-x-0 bottom-0 z-[56] mx-auto flex h-[82%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            {/* Drag handle — swipe down to dismiss. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
            >
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            {/* Poster header. */}
            <div className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="font-display text-lg font-semibold text-white">
                  <Handle username={confession.username} emoji={confession.alias} size={18} />
                </div>
                <IdentityMeta
                  gender={confession.gender}
                  age={confession.age}
                  location={confession.location}
                  size="sm"
                  className="mt-0.5"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <TipButton toUserId={confession.authorId} reff={confession.id} compact />
                {confession.alias !== "You" && <SafetyMenu confession={confession} />}
                <button
                  onClick={closeConnection}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* The confession you're responding to — media + text. Tap to open it. */}
            <button
              onClick={() => {
                closeConnection();
                openPost(confession.id);
              }}
              className="mx-5 mb-2 flex items-stretch gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 text-left transition active:scale-[0.99]"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                {confession.mediaKind === "video" && confession.photo ? (
                  <VeiledVideo
                    src={confession.photo}
                    level={displayLevel(confession)}
                    nsfw={isNsfwHidden(confession)}
                    clipStart={confession.clipStart}
                    clipEnd={confession.clipEnd}
                    paused
                    scrim={false}
                  />
                ) : confession.photo ? (
                  <VeiledPhoto
                    src={confession.photo}
                    level={displayLevel(confession)}
                    nsfw={isNsfwHidden(confession)}
                    scrim={false}
                  />
                ) : (
                  <VeiledArt seed={confession.seed} level={displayLevel(confession)} />
                )}
              </div>
              <p className="line-clamp-3 flex-1 self-center text-sm leading-snug text-white/85">
                {confession.text}
              </p>
            </button>

            {/* Friend action (not for your own posts). */}
            {confession.alias !== "You" && (
              <div className="px-5 pb-2">
                <FriendButton
                  status={friendStatus(id)}
                  onAdd={() => requestFriend(confession)}
                  onAccept={() => acceptFriend(id)}
                />
              </div>
            )}

            {/* Comments header. */}
            <div className="mx-5 mb-1 flex items-center gap-2 px-1 text-sm font-semibold text-white/70">
              <MessagesSquare className="h-4 w-4 text-veil-200" />
              Comments{commentList.length ? ` · ${commentList.length}` : ""}
            </div>

            <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 py-2">
              {commentList.length === 0 ? (
                <EmptyState text="No comments yet. Be the first to respond." />
              ) : (
                commentList.map((c) => {
                  const t = tallies[c.id] ?? { vybs: 0, fails: 0, mine: null };
                  const net = t.fails - t.vybs;
                  const veiled = net >= 3 && !shownVeiled.has(c.id);
                  const open = revealedComment === c.id;
                  if (veiled) {
                    return (
                      <button
                        key={c.id}
                        onClick={() => setShownVeiled((s) => new Set(s).add(c.id))}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-xs text-white/40"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Hidden by the community — tap to view
                      </button>
                    );
                  }
                  return (
                    <div
                      key={c.id}
                      className={cx(
                        "rounded-2xl border p-3 transition",
                        c.mine
                          ? "border-veil-400/30 bg-veil-500/10"
                          : "border-white/8 bg-white/[0.03]"
                      )}
                    >
                      <div className="mb-0.5 flex items-center justify-between">
                        <Handle
                          username={c.username}
                          emoji={c.author}
                          size={13}
                          className="text-xs font-semibold text-white/80"
                        />
                        <span className="text-[10px] text-white/35">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={() => setRevealedComment(open ? null : c.id)}
                        className="block w-full text-left text-sm leading-snug text-white/85"
                      >
                        {c.text}
                      </button>

                      {(open || t.vybs > 0 || t.fails > 0) && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => castCommentVote(c, "fail")}
                            className={cx(
                              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
                              t.mine === "fail"
                                ? "bg-shroud/20 text-shroud ring-1 ring-shroud/40"
                                : "bg-white/[0.05] text-white/60"
                            )}
                          >
                            <EyeOff className="h-3 w-3" /> {t.fails || ""} Fail
                          </button>
                          <button
                            onClick={() => castCommentVote(c, "vyb")}
                            className={cx(
                              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
                              t.mine === "vyb"
                                ? "bg-feel/20 text-feel ring-1 ring-feel/40"
                                : "bg-white/[0.05] text-white/60"
                            )}
                          >
                            <Heart className="h-3 w-3" /> {t.vybs || ""} Vyb
                          </button>
                          {!c.mine && (
                            <button
                              onClick={() => reportComment(c)}
                              aria-label="Report comment"
                              className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-white/45 transition active:scale-95 hover:text-wild"
                            >
                              <Flag className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {alreadyCommented ? (
              <div className="flex items-center justify-center gap-2 border-t border-white/8 p-4 text-sm text-white/45">
                <Check className="h-4 w-4" />
                You've left your comment on this confession.
              </div>
            ) : (
              <Composer
                value={commentDraft}
                onChange={setCommentDraft}
                onSubmit={submitComment}
                placeholder="Add your comment…"
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FriendButton({
  status,
  onAdd,
  onAccept,
}: {
  status: "none" | "requested" | "incoming" | "friends";
  onAdd: () => void;
  onAccept: () => void;
}) {
  if (status === "friends") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-feel/30 bg-feel/10 py-2 text-sm font-semibold text-feel">
        <Check className="h-4 w-4" />
        Friends
      </div>
    );
  }
  if (status === "requested") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-white/45">
        <Clock className="h-4 w-4" />
        Request sent
      </div>
    );
  }
  if (status === "incoming") {
    return (
      <button
        onClick={onAccept}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-veil-500 py-2 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
      >
        <UserPlus className="h-4 w-4" />
        Accept friend request
      </button>
    );
  }
  return (
    <button
      onClick={onAdd}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-veil-400/40 bg-veil-500/15 py-2 text-sm font-semibold text-veil-100 transition active:scale-[0.98]"
    >
      <UserPlus className="h-4 w-4" />
      Add friend
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-sm text-white/40">{text}</p>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/8 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 280))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={placeholder}
        className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        aria-label="Send"
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90",
          value.trim()
            ? "bg-veil-500 text-white shadow-glow"
            : "bg-white/5 text-white/30"
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
