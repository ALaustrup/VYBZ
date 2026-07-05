import { supabase, BACKEND_ENABLED } from "@/lib/supabase";

// Re-export so callers don't need to also import @/lib/supabase.
export { supabase, BACKEND_ENABLED };
import type {
  AmbientPresence,
  AppNotification,
  Circle,
  CircleMember,
  CircleMessage,
  Comment,
  Companion,
  CompanionMessage,
  Confession,
  EchoConfig,
  EchoPublic,
  EchoVisitor,
  Identity,
  Message,
  NotificationKind,
  ProfileDetails,
  Reaction,
  Room,
  RoomMessage,
  RoomPresence,
} from "@/types";

// ---------------------------------------------------------------------------
// Backend service. Thin, typed wrappers over Supabase used when BACKEND_ENABLED.
// Every function is a no-op / empty when the backend isn't configured, so the
// app keeps working in local mode.
// ---------------------------------------------------------------------------

/** A confession id that lives in Postgres (uuid) vs. a local/demo one. */
export function isBackendId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
}

// --- Live streaming --------------------------------------------------------

export interface LiveStream {
  id: string;
  userId: string;
  username: string | null;
  title: string | null;
  nsfw: boolean;
  provider: string;
  playbackId: string | null;
  startedAt: number;
  vybs: number;
  fails: number;
}

/** Map a live_carousel / live_my_vybs SQL row to a LiveStream. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLiveStream(r: any): LiveStream {
  return {
    id: r.stream_id,
    userId: r.user_id,
    username: r.username ?? null,
    title: r.title ?? null,
    nsfw: !!r.nsfw,
    provider: r.provider ?? "livekit",
    playbackId: r.playback_id ?? null,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : Date.now(),
    vybs: r.vybs ?? 0,
    fails: r.fails ?? 0,
  };
}

/** The community-curated carousel of open streams in the caller's age layer. */
export async function fetchLiveCarousel(limit = 12): Promise<LiveStream[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("live_carousel", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(rowToLiveStream);
}

/**
 * The caller's personal list of Vyb'd streams that are still live — the "saved"
 * shelf for one-tap re-entry. Carousel excludes streams you've already reacted
 * to, so this is where Vyb'd streams remain reachable.
 */
export async function fetchMyVybedStreams(limit = 30): Promise<LiveStream[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("live_my_vybs", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(rowToLiveStream);
}

/** Start a new stream for the current user. Returns the stream id + age layer. */
export async function liveStart(input: {
  title?: string;
  nsfw?: boolean;
  record?: boolean;
}): Promise<{ streamId: string; ageLayer: "teen" | "adult"; provider: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("live_start", {
    p_title: input.title ?? null,
    p_nsfw: !!input.nsfw,
    p_record: !!input.record,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[] | null)?.[0];
  if (error || !r) return null;
  return { streamId: r.stream_id, ageLayer: r.age_layer, provider: r.provider };
}

/** Streamer ends their own stream. */
export async function liveEnd(streamId: string): Promise<void> {
  await supabase?.rpc("live_end", { p_stream: streamId });
}

/** Viewer Vyb/Fail swipe on a stream. */
export async function liveReact(streamId: string, reaction: "vyb" | "fail"): Promise<void> {
  await supabase?.rpc("live_react", { p_stream: streamId, p_reaction: reaction });
}

/** One-tap viewer report on a stream (community safety net). */
export async function liveReport(streamId: string, reason?: string): Promise<void> {
  await supabase?.rpc("live_report", { p_stream: streamId, p_reason: reason ?? null });
}

/** Owner-only live tally so a streamer can watch their Vybs climb in real time. */
export async function liveStreamTally(
  streamId: string
): Promise<{ vybs: number; fails: number; peakViewers: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("live_stream_tally", { p_stream: streamId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[] | null)?.[0];
  if (error || !r) return null;
  return { vybs: r.vybs ?? 0, fails: r.fails ?? 0, peakViewers: r.peak_viewers ?? 0 };
}

/** Streamer reports the current concurrent-viewer count; server keeps the max. */
export async function liveSetViewers(streamId: string, count: number): Promise<void> {
  await supabase?.rpc("live_set_viewers", {
    p_stream: streamId,
    p_count: Math.max(0, Math.round(count)),
  });
}

/** Lifetime performance for a streamer's exclusive profile analytics section. */
export interface StreamStats {
  totalStreams: number;
  totalVybs: number;
  totalFails: number;
  bestVybs: number;
  peakViewers: number;
  totalSeconds: number;
  lastStreamedAt: number | null;
  recent: {
    id: string;
    title: string | null;
    startedAt: number;
    endedAt: number | null;
    vybs: number;
    fails: number;
    peakViewers: number;
    seconds: number;
  }[];
}

/** Aggregate live analytics for the current user (null when unavailable). */
export async function fetchMyStreamStats(): Promise<StreamStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("live_my_stream_stats");
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    totalStreams: d.total_streams ?? 0,
    totalVybs: d.total_vybs ?? 0,
    totalFails: d.total_fails ?? 0,
    bestVybs: d.best_vybs ?? 0,
    peakViewers: d.peak_viewers ?? 0,
    totalSeconds: d.total_seconds ?? 0,
    lastStreamedAt: d.last_streamed_at ? new Date(d.last_streamed_at).getTime() : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recent: ((d.recent ?? []) as any[]).map((r) => ({
      id: r.id,
      title: r.title ?? null,
      startedAt: r.started_at ? new Date(r.started_at).getTime() : 0,
      endedAt: r.ended_at ? new Date(r.ended_at).getTime() : null,
      vybs: r.vybs ?? 0,
      fails: r.fails ?? 0,
      peakViewers: r.peak_viewers ?? 0,
      seconds: r.seconds ?? 0,
    })),
  };
}

/** Exchange a Supabase session for a short-lived LiveKit access token. */
export async function liveMintToken(
  streamId: string,
  role: "publisher" | "viewer"
): Promise<{ token: string; url: string; room: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("live-token", {
    body: { stream_id: streamId, role },
  });
  if (error || !data) return null;
  const d = data as { token: string; url: string; room: string };
  return d.token && d.url ? d : null;
}

// --- Live stream chat (ephemeral overlay) ----------------------------------

export interface LiveChatMsg {
  from: string;
  username: string;
  text: string;
  t: number;
}

/**
 * Ephemeral live-stream chat. Messages flow over Supabase Realtime broadcast
 * (NEVER stored). The streamer can broadcast a "mute:<userId>" control to all
 * viewers; the client honors it by hiding that sender's future messages.
 */
export function joinLiveChat(
  streamId: string,
  meId: string,
  meUsername: string,
  onMsg: (m: LiveChatMsg) => void,
  onMute?: (userId: string) => void
): {
  send: (text: string) => void;
  mute: (userId: string) => void;
  leave: () => void;
} {
  if (!supabase) return { send: () => {}, mute: () => {}, leave: () => {} };
  const channel = supabase.channel(`live-chat:${streamId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on("broadcast", { event: "msg" }, (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = p.payload as any;
      if (m && m.from !== meId)
        onMsg({
          from: m.from,
          username: String(m.username ?? "Someone"),
          text: String(m.text ?? ""),
          t: m.t ?? Date.now(),
        });
    })
    .on("broadcast", { event: "mute" }, (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uid = (p.payload as any)?.userId as string | undefined;
      if (uid && onMute) onMute(uid);
    })
    .subscribe();
  return {
    send: (text: string) => {
      const clean = text.trim().replace(/\b(?:https?:\/\/|www\.)\S+/gi, "").slice(0, 240);
      if (!clean) return;
      void channel.send({
        type: "broadcast",
        event: "msg",
        payload: { from: meId, username: meUsername, text: clean, t: Date.now() },
      });
    },
    mute: (userId: string) => {
      void channel.send({ type: "broadcast", event: "mute", payload: { userId } });
    },
    leave: () => void supabase?.removeChannel(channel),
  };
}

/** Tap-to-tip the streamer 1/5/25 V¢. Server checks: wallet, balance, banned. */
export async function tipStreamer(
  streamId: string,
  toUserId: string,
  amount: number
): Promise<boolean> {
  if (!supabase) return false;
  const a = Math.max(1, Math.min(25, Math.floor(amount)));
  const { data, error } = await supabase.rpc("tip_credits", {
    p_to: toUserId,
    p_amount: a,
    p_ref: `live:${streamId}`,
  });
  return !error && data === true;
}

// --- Lifelines (peer support, life-saving) ---------------------------------

export interface LifelineSession {
  sessionId: string;
  lifelineId: string;
}

/** Become an opted-in Lifeline (eligibility enforced server-side). */
export async function becomeLifeline(language = "en"): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("become_lifeline", { p_lang: language });
  return data === true;
}

/** Flip on-shift availability. */
export async function setLifelineAvailable(on: boolean): Promise<void> {
  await supabase?.rpc("set_lifeline_available", { p_on: on });
}

/** Count of Lifelines currently on shift matching my age layer + language. */
export async function lifelineCountAvailable(language = "en"): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("lifeline_count_available", { p_language: language });
  return (data as number) ?? 0;
}

/** Request a Lifeline. Returns the session when matched, or null if queued. */
export async function lifelineRequest(language = "en"): Promise<{
  session: LifelineSession | null;
  waiting: boolean;
}> {
  if (!supabase) return { session: null, waiting: false };
  const { data, error } = await supabase.rpc("lifeline_request", { p_language: language });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[] | null)?.[0];
  if (error || !r) return { session: null, waiting: false };
  return {
    session: r.session_id
      ? { sessionId: r.session_id, lifelineId: r.lifeline_id }
      : null,
    waiting: !!r.waiting,
  };
}

/** Cancel a pending Lifeline request (changed mind / no longer needed). */
export async function lifelineCancel(): Promise<void> {
  await supabase?.rpc("lifeline_cancel");
}

/** End an active Lifeline session (either party). */
export async function lifelineEnd(sessionId: string, reason = "requester"): Promise<void> {
  await supabase?.rpc("lifeline_end", { p_session: sessionId, p_reason: reason });
}

/** Notify the waiting requester the moment a session is created for them. */
export function subscribeLifelineMatch(
  myId: string,
  onMatch: (m: LifelineSession) => void
): () => void {
  if (!supabase || !myId) return () => {};
  const channel = supabase
    .channel(`lifeline-match:${myId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lifeline_sessions",
        filter: `requester_id=eq.${myId}`,
      },
      (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = payload.new as any;
        if (row?.id) onMatch({ sessionId: row.id, lifelineId: row.lifeline_id });
      }
    )
    .subscribe();
  return () => void supabase?.removeChannel(channel);
}

export interface LifelineMsg {
  from: string;
  text: string;
  t: number;
}

/**
 * Mint a short-lived LiveKit token so both parties of a Lifeline session can
 * switch to voice if they both consent (audio-only — no video, no recording).
 */
export async function lifelineMintVoiceToken(
  sessionId: string
): Promise<{ token: string; url: string; room: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("lifeline-token", {
    body: { session_id: sessionId },
  });
  if (error || !data) return null;
  const d = data as { token: string; url: string; room: string };
  return d.token && d.url ? d : null;
}

/** Voice-control signals exchanged through the lifeline room's broadcast channel. */
export type LifelineSignal =
  | { kind: "voice-offer" }
  | { kind: "voice-accept" }
  | { kind: "voice-decline" }
  | { kind: "voice-end" };

/** Ephemeral, text-only broadcast room for a Lifeline session (NEVER stored). */
export function joinLifelineRoom(
  sessionId: string,
  meId: string,
  onMsg: (m: LifelineMsg) => void,
  onPartnerLeft: () => void,
  onSignal?: (s: LifelineSignal) => void
): {
  send: (text: string) => void;
  signal: (s: LifelineSignal) => void;
  leave: (announce?: boolean) => void;
} {
  if (!supabase)
    return { send: () => {}, signal: () => {}, leave: () => {} };
  const channel = supabase.channel(`lifeline-room:${sessionId}`, {
    config: { broadcast: { self: false }, presence: { key: meId } },
  });
  channel
    .on("broadcast", { event: "msg" }, (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = p.payload as any;
      if (m && m.from !== meId) onMsg({ from: m.from, text: String(m.text ?? ""), t: m.t ?? Date.now() });
    })
    .on("broadcast", { event: "leave" }, (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((p.payload as any)?.from !== meId) onPartnerLeft();
    })
    .on("broadcast", { event: "sig" }, (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = p.payload as any;
      if (m && m.from !== meId && onSignal) onSignal(m.s as LifelineSignal);
    })
    .subscribe();
  return {
    send: (text: string) => {
      const t = Date.now();
      void channel.send({ type: "broadcast", event: "msg", payload: { from: meId, text, t } });
    },
    signal: (s: LifelineSignal) => {
      void channel.send({ type: "broadcast", event: "sig", payload: { from: meId, s } });
    },
    leave: (announce = true) => {
      if (announce) {
        void channel.send({ type: "broadcast", event: "leave", payload: { from: meId } });
      }
      void supabase?.removeChannel(channel);
    },
  };
}

// --- Push subscriptions -----------------------------------------------------

/** Persist a Web Push subscription for the current user (idempotent by endpoint). */
export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  platform?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      platform: input.platform ?? "web",
    },
    { onConflict: "endpoint" }
  );
  return !error;
}

/** Remove a push subscription (on unsubscribe / pause). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export interface SessionInfo {
  userId: string;
}

/** Restore an existing session, if any. */
export async function getSession(): Promise<SessionInfo | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? { userId: data.session.user.id } : null;
}

/** Anonymous sign-in (no email/password) — MYVYB's seamless account. */
export async function signInAnon(): Promise<SessionInfo | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("anon sign-in failed");
  return { userId: data.user.id };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export interface ProfileRow {
  id: string;
  alias: string;
  /** Canonical username identity (null until set/generated). */
  username: string | null;
  /** True once the one-time "Customize Username" change has been used. */
  username_changed?: boolean;
  aura: string;
  gender: "M" | "F" | null;
  age: number | null;
  location: string | null;
  identity_public: boolean;
  /** Server-verified Godmode entitlement (set by the Stripe webhook). */
  godmode: boolean;
  /** Global "show sensitive content" opt-in. */
  nsfw_opt_in: boolean;
  /** Recorded 18+ consent (required, with a verified contact, to unlock NSFW). */
  nsfw_consent: boolean;
  /** Canonical emoji-identity key (null until claimed). */
  emoji_key: string | null;
  /** Operator/admin role. */
  is_admin: boolean;
  /** Remaining one-time self age/sex changes. */
  identity_changes_remaining: number;
  /** V¢ balance. */
  credits: number;
  /** "Enter anonymously" users have no V¢ wallet. */
  anonymous: boolean;
  /** Equipped cosmetics: { font?, border?, theme?, animation?, flair? }. */
  cosmetic_loadout: Record<string, string>;
  /** Optional music playlist/track link shown on the profile. */
  music_url: string | null;
  /** Personalization that follows the account (dock/bg/transition + unlocks). */
  prefs: Record<string, unknown>;
  /** Rich profile data points (interests, prompts, traits, …). Owner-private. */
  profile?: ProfileDetails;
}

/**
 * Persist the current user's rich profile data points (RLS: self). The raw
 * column is owner-private; it is served sanitized to others via public_profile.
 */
export async function saveProfileDetails(
  userId: string,
  details: ProfileDetails
): Promise<void> {
  if (!supabase) return;
  await supabase.from("profiles").update({ profile: details }).eq("id", userId);
}

// --- Creator roles (VYBZ Phase 1) — the bipartite OFFER/SEEK core ------------
export interface RoleOffer {
  roleId: string;
  /** Self-rated skill 1..5. */
  skill: number;
}
export interface RoleSeek {
  roleId: string;
  /** Priority 1 (nice-to-have) .. 3 (must-have). */
  priority: number;
}

/** The caller's own offered + sought roles (raw ids), for the editor. */
export async function fetchMyCreatorRoles(): Promise<{
  offers: RoleOffer[];
  seeks: RoleSeek[];
}> {
  if (!supabase) return { offers: [], seeks: [] };
  const { data } = await supabase.rpc("my_creator_roles");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = ((data as any[] | null) ?? [])[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offers = ((row?.offers as any[]) ?? []).map((o) => ({
    roleId: String(o.role_id),
    skill: Number(o.skill) || 3,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seeks = ((row?.seeks as any[]) ?? []).map((s) => ({
    roleId: String(s.role_id),
    priority: Number(s.priority) || 1,
  }));
  return { offers, seeks };
}

/** Replace the caller's offered + sought roles atomically (SECURITY DEFINER). */
export async function saveCreatorRoles(
  offers: RoleOffer[],
  seeks: RoleSeek[]
): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("set_creator_roles", {
    p_offers: offers.map((o) => ({ role_id: o.roleId, skill: o.skill })),
    p_seeks: seeks.map((s) => ({ role_id: s.roleId, priority: s.priority })),
  });
}

/** A user's offered + sought role LABELS for public display. World-readable. */
export async function fetchCreatorRolesFor(
  id: string
): Promise<{ offers: string[]; seeks: string[] }> {
  if (!supabase) return { offers: [], seeks: [] };
  const { data } = await supabase.rpc("creator_roles_for", { p_id: id });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = ((data as any[] | null) ?? [])[0];
  return {
    offers: (row?.offers as string[] | null) ?? [],
    seeks: (row?.seeks as string[] | null) ?? [],
  };
}

/** Account-synced personalization (cross-device). */
export interface UserPrefs {
  dockColor?: string;
  dockFx?: string;
  bgVariant?: string;
  pageTransition?: string;
  unlocks?: string[];
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

/** Create or update the emoji identity (alias) + aura. */
export async function upsertProfile(p: {
  id: string;
  alias: string;
  aura: string;
  emojiKey?: string;
  /** True for "Enter anonymously" users (no V¢ wallet). */
  anonymous?: boolean;
}): Promise<void> {
  if (!supabase) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { id: p.id, alias: p.alias, aura: p.aura };
  if (p.emojiKey) row.emoji_key = p.emojiKey;
  if (p.anonymous !== undefined) row.anonymous = p.anonymous;
  await supabase.from("profiles").upsert(row, { onConflict: "id" });
}

/** Whether an emoji identity (canonical key) is free to claim. */
export async function isEmojiAvailable(
  emojiKey: string,
  excludeId?: string
): Promise<boolean> {
  if (!supabase) return true;
  let query = supabase.from("profiles").select("id").eq("emoji_key", emojiKey);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1);
  return !data || data.length === 0;
}

/** Claim / change the user's emoji identity. Returns false on a uniqueness clash. */
export async function setEmojiIdentity(
  userId: string,
  emoji: string,
  emojiKey: string
): Promise<boolean> {
  if (!supabase) return true;
  if (!(await isEmojiAvailable(emojiKey, userId))) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ alias: emoji, emoji_key: emojiKey })
    .eq("id", userId);
  return !error;
}

/** Promote an anonymous account to an identified (non-anonymous) member. */
export async function markIdentified(userId: string): Promise<void> {
  await supabase?.from("profiles").update({ anonymous: false }).eq("id", userId);
}

// --- Usernames -------------------------------------------------------------

/** Live availability check for a chosen username (pre-auth friendly). */
export async function usernameAvailable(name: string): Promise<boolean> {
  if (!supabase) return true;
  const { data } = await supabase.rpc("username_available", { p_name: name });
  return data !== false;
}

/** Claim a chosen username + become an identified member. */
export async function claimUsername(name: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("claim_username", { p_name: name });
  return data === true;
}

/** One-time username customization (guests + members). False if used/taken. */
export async function changeUsername(name: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("change_username", { p_name: name });
  return data === true;
}

/**
 * Assign a generated username to the current (guest) account without changing
 * the anonymous tier. Retries on the rare uniqueness clash. Returns the name set.
 */
export async function assignGeneratedUsername(
  userId: string,
  candidate: string,
  retry = (): string => candidate
): Promise<string | null> {
  if (!supabase) return candidate;
  let name = candidate;
  for (let i = 0; i < 4; i++) {
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", userId);
    if (!error) return name;
    name = retry(); // generate a fresh candidate on conflict
  }
  return null;
}

/** Request a 4-letter email verification code for a username claim. */
export async function requestEmailCode(
  email: string,
  username: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "backend off" };
  const { data, error } = await supabase.functions.invoke("email-code", {
    body: { action: "request", email, username },
  });
  if (error) return { ok: false, error: await edgeErrorDetail(error) };
  const d = data as { ok?: boolean; error?: string };
  return d?.ok ? { ok: true } : { ok: false, error: d?.error ?? "failed" };
}

/**
 * supabase.functions.invoke surfaces non-2xx responses as a FunctionsHttpError
 * and hides the JSON body. This digs the real reason out of the carried Response
 * (e.g. Resend "domain not verified") so failures are diagnosable, not silent.
 */
async function edgeErrorDetail(error: unknown): Promise<string> {
  const base = (error as { message?: string })?.message ?? "request failed";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      return body?.detail || body?.error || base;
    }
  } catch {
    /* ignore — fall back to the generic message */
  }
  return base;
}

/**
 * Verify the email code → establish a session → claim the reserved username.
 * Returns the claimed username on success.
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ ok: boolean; username?: string; error?: string }> {
  if (!supabase) return { ok: false, error: "backend off" };
  const { data, error } = await supabase.functions.invoke("email-code", {
    body: { action: "verify", email, code },
  });
  if (error) return { ok: false, error: error.message };
  const d = data as { ok?: boolean; tokenHash?: string; username?: string; error?: string };
  if (!d?.ok || !d.tokenHash) return { ok: false, error: d?.error ?? "wrong code" };
  const { error: otpErr } = await supabase.auth.verifyOtp({
    token_hash: d.tokenHash,
    type: "magiclink",
  });
  if (otpErr) return { ok: false, error: otpErr.message };
  // Session is live; claim the reserved username on the (now identified) account.
  if (d.username) await supabase.rpc("claim_username", { p_name: d.username });
  return { ok: true, username: d.username };
}

/**
 * Watchlist ("name snipe") — a Godmode perk. A user can watch a currently-taken
 * emoji name; when it frees (e.g. the holder goes inactive and is reset), the
 * client surfaces a live "claim it now" alert and the first to claim wins. The
 * unique index on profiles.emoji_key makes that claim race atomic — exactly one
 * winner, never a tie. No hostile takeover: watching never evicts the holder.
 */
export async function watchName(userId: string, emojiKey: string): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase
    .from("name_watchers")
    .upsert(
      { user_id: userId, emoji_key: emojiKey },
      { onConflict: "user_id,emoji_key" }
    );
  return !error;
}

export async function unwatchName(userId: string, emojiKey: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("name_watchers")
    .delete()
    .eq("user_id", userId)
    .eq("emoji_key", emojiKey);
}

/** Canonical emoji keys the user is currently watching. */
export async function fetchWatched(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("name_watchers")
    .select("emoji_key")
    .eq("user_id", userId);
  return (data ?? []).map((r) => (r as { emoji_key: string }).emoji_key);
}

export async function getProfile(_id: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  // Own profile via a SECURITY DEFINER function so the owner can read their own
  // private self-disclosures (gender/age/location), which are locked from direct
  // client SELECT for everyone else. (Reads the caller's row via auth.uid().)
  const { data } = await supabase.rpc("my_profile");
  return ((data as ProfileRow[] | null) ?? [])[0] ?? null;
}

/**
 * Durable accounts: attach an email to the current (anonymous) account. Supabase
 * sends a confirmation link; once confirmed the account is recoverable and can
 * sign in from any device. The anonymous user id — and all its content — is
 * preserved.
 */
export async function linkEmail(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Backend is not configured." };
  // Make the confirmation link return straight to the app.
  const emailRedirectTo =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.updateUser(
    { email },
    emailRedirectTo ? { emailRedirectTo } : undefined
  );
  return error ? { error: error.message } : {};
}

/**
 * Passwordless sign-in / recovery via an email magic link. One field for both
 * returning and brand-new users: clicking the emailed link signs into the
 * existing account or creates a fresh durable one. This is the seamless way to
 * return on a new device (the anonymous-only session can't otherwise be
 * recovered).
 */
export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Backend is not configured." };
  const emailRedirectTo =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  });
  return error ? { error: error.message } : {};
}

/**
 * Subscribe to auth changes (magic-link return, token refresh, sign-out) so the
 * app re-hydrates instantly without a manual reload. Returns an unsubscribe fn.
 */
export function onAuthChange(
  cb: (event: string, userId: string | null) => void
): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

/** Whether the current account already has a confirmed email (is durable). */
export async function getLinkedEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

/**
 * Update the profile's "About you" (sex/age/location) + public/private flag,
 * and propagate the snapshot onto the user's existing confessions so privacy
 * applies retroactively (private => details are blanked from all their posts).
 */
export async function updateProfileIdentity(
  id: string,
  identity: Identity,
  isPublic: boolean
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({
      gender: identity.gender ?? null,
      age: identity.age ?? null,
      location: identity.location ?? null,
      identity_public: isPublic,
    })
    .eq("id", id);
  await supabase
    .from("confessions")
    .update({
      author_gender: isPublic ? identity.gender ?? null : null,
      author_age: isPublic ? identity.age ?? null : null,
      author_location: isPublic ? identity.location ?? null : null,
    })
    .eq("author_id", id);
}

// --- Storage ---------------------------------------------------------------

// Map a MIME type to a file extension for Storage object naming.
function extForType(type: string): string {
  if (type.includes("webp")) return "webp";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("quicktime") || type.includes("mov")) return "mov";
  return "jpg";
}

/** Storage bucket for sensitive, user-uploaded POST media — private. */
const POST_BUCKET = "confessions";
/** Public bucket for cosmetic media (avatars/banners) + ephemeral chat images. */
const PUBLIC_BUCKET = "media-public";
/** Signed-URL lifetime for post media (seconds). Re-signed on every fetch. */
const SIGN_TTL = 2 * 60 * 60;

async function toBlob(source: Blob | string): Promise<Blob> {
  return typeof source === "string" ? await (await fetch(source)).blob() : source;
}

export interface MediaUploadResult {
  /** Storage path when the upload succeeded; null otherwise. */
  path: string | null;
  /** Human-readable reason when it failed (surfaced to the user). */
  error: string | null;
}

/**
 * Translate Storage errors into a clear, actionable message. The most common
 * real-world failure is exceeding the size limit, which Storage reports as a 413
 * / "Payload too large" / "exceeded the maximum allowed size".
 */
function describeUploadError(err: unknown, sizeBytes: number): string {
  const raw =
    (err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err ?? "")) || "Upload failed";
  const mb = Math.round(sizeBytes / (1024 * 1024));
  if (/maximum allowed size|payload too large|413|entity too large/i.test(raw)) {
    return `That file (${mb} MB) is over the storage size limit. Raise the Supabase project upload limit (Storage → Settings) to accept larger media.`;
  }
  if (/mime|content type|not allowed/i.test(raw)) {
    return "That file type isn't allowed by storage. Try a standard image (JPEG/PNG/WebP) or video (MP4/WebM/MOV).";
  }
  if (/row-level security|rls|unauthorized|jwt|permission/i.test(raw)) {
    return "You need to be signed in to upload media. Verify your account, then try again.";
  }
  return raw;
}

/**
 * Upload POST media to the PRIVATE `confessions` bucket. Returns the storage PATH
 * (never a public URL) plus a surfaced error string on failure. Retries once on
 * transient network errors. Callers mint short-lived signed URLs to display.
 */
/**
 * PUT a blob to a Supabase signed upload URL via XHR so we can report real
 * byte-level upload progress (the JS client's `.upload()` exposes none).
 * Resolves { ok } — callers fall back to the standard upload on failure.
 */
function putWithProgress(
  url: string,
  blob: Blob,
  type: string,
  onProgress: (frac: number) => void
): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("content-type", type);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.min(0.99, e.loaded / e.total));
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        if (ok) onProgress(1);
        resolve({ ok });
      };
      xhr.onerror = () => resolve({ ok: false });
      xhr.onabort = () => resolve({ ok: false });
      xhr.send(blob);
    } catch {
      resolve({ ok: false });
    }
  });
}

export async function uploadConfessionMedia(
  source: Blob | string,
  userId: string,
  onProgress?: (frac: number) => void
): Promise<MediaUploadResult> {
  if (!supabase) return { path: null, error: "Storage is unavailable right now." };
  let blob: Blob;
  try {
    blob = await toBlob(source);
  } catch {
    return { path: null, error: "Couldn't read that file to upload." };
  }
  const type = blob.type || "image/jpeg";

  // Preferred path: a signed upload URL + XHR so we can stream real progress.
  if (onProgress) {
    try {
      const path = `${userId}/${crypto.randomUUID()}.${extForType(type)}`;
      const { data, error } = await supabase.storage
        .from(POST_BUCKET)
        .createSignedUploadUrl(path);
      if (!error && data?.signedUrl) {
        const { ok } = await putWithProgress(data.signedUrl, blob, type, onProgress);
        if (ok) return { path, error: null };
      }
    } catch {
      /* fall through to the standard upload below */
    }
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const path = `${userId}/${crypto.randomUUID()}.${extForType(type)}`;
    try {
      const { error } = await supabase.storage
        .from(POST_BUCKET)
        .upload(path, blob, {
          contentType: type,
          upsert: false,
          cacheControl: "3600",
        });
      if (!error) {
        onProgress?.(1);
        return { path, error: null };
      }
      lastErr = error;
      // Size / type / auth errors won't pass on retry — fail fast.
      if (!/network|fetch|timeout|temporarily/i.test(String((error as { message?: string })?.message ?? ""))) {
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  return { path: null, error: describeUploadError(lastErr, blob.size) };
}

/** A storage value is a private path when it has no URL scheme. */
function isStoragePath(v?: string | null): v is string {
  return !!v && !/^(https?:|data:|blob:)/i.test(v);
}

/** Mint a short-lived signed URL for a private post-media path. */
export async function signedMediaUrl(path: string): Promise<string | null> {
  if (!supabase || !isStoragePath(path)) return path ?? null;
  const { data } = await supabase.storage
    .from(POST_BUCKET)
    .createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl ?? null;
}

/**
 * Replace any private storage paths in a confession list with fresh signed URLs
 * (batched). Public URLs / data URLs pass through untouched. Applied by every
 * fetch path so the UI always receives a directly-renderable, expiring URL.
 */
async function signMediaList(list: Confession[]): Promise<Confession[]> {
  if (!supabase) return list;
  const paths = Array.from(
    new Set(list.map((c) => c.photo).filter((p): p is string => isStoragePath(p)))
  );
  if (paths.length === 0) return list;
  const { data } = await supabase.storage
    .from(POST_BUCKET)
    .createSignedUrls(paths, SIGN_TTL);
  const map = new Map<string, string>();
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return list.map((c) =>
    c.photo && map.has(c.photo) ? { ...c, photo: map.get(c.photo) as string } : c
  );
}

/**
 * Upload cosmetic / chat media to the PUBLIC bucket and return its public URL.
 * Used for avatars, banners, and ephemeral room/circle images (not sensitive
 * post content).
 */
export async function uploadPublicMedia(
  source: Blob | string,
  userId: string
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const blob = await toBlob(source);
    const type = blob.type || "image/jpeg";
    const path = `${userId}/${crypto.randomUUID()}.${extForType(type)}`;
    const { error } = await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(path, blob, { contentType: type, upsert: false });
    if (error) return null;
    return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/** Back-compat alias used by rooms/circles: public chat image upload. */
export async function uploadConfessionPhoto(
  dataUrl: string,
  userId: string
): Promise<string | null> {
  return uploadPublicMedia(dataUrl, userId);
}

// --- Confessions -----------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToConfession(r: any): Confession {
  return {
    id: r.id,
    authorId: r.author_id ?? undefined,
    // Username-first: prefer the author's current username, then the live
    // profile alias, then the per-post stored alias for legacy rows.
    alias: r.author?.username ?? r.author?.alias ?? r.alias ?? "Someone",
    // Canonical username identity (shown by the Handle component).
    username: r.author?.username ?? undefined,
    // Identity comes from the per-post snapshot (only set when the author is
    // public), never from the live profile — so private users never leak.
    text: r.body,
    distance: "Nearby",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    feels: r.feels ?? 0,
    wilds: r.wilds ?? 0,
    featured: r.featured ?? false,
    seed: r.seed ?? 0,
    aftermath: r.aftermath ?? undefined,
    photo: r.photo_url ?? undefined,
    mediaKind: (r.media_kind as "image" | "video") ?? "image",
    clipStart: r.clip_start ?? undefined,
    clipEnd: r.clip_end ?? undefined,
    nsfw: r.nsfw ?? undefined,
    gender: r.author_gender ?? undefined,
    age: r.author_age ?? undefined,
    location: r.author_location ?? undefined,
    fontStyle: r.font_style ?? undefined,
    textFx: r.text_fx ?? undefined,
    view3d: r.view_3d ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Recent confessions authored by real users, newest first. */
export async function fetchRecentConfessions(limit = 40): Promise<Confession[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("confessions")
    .select(
      "id,author_id,alias,body,photo_url,media_kind,clip_start,clip_end,feels,wilds,featured,seed,aftermath,nsfw,author_gender,author_age,author_location,font_style,text_fx,view_3d,created_at,author:profiles!confessions_author_id_fkey(emoji_key,alias,username)"
    )
    .eq("hidden", false)
    .eq("archived", false)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return signMediaList(data.map(rowToConfession));
}

/**
 * Personalized "For You" feed from the Vyb affinity engine (co-Vyb collaborative
 * filtering). Returns confessions ranked by shared-Vyb affinity, in that order.
 */
export async function fetchForYou(limit = 40): Promise<Confession[]> {
  if (!supabase) return [];
  const { data: idRows, error: idErr } = await supabase.rpc("for_you_ids", { p_limit: limit });
  if (idErr || !idRows) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ids = (idRows as any[]).map((r) => r.confession_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("confessions")
    .select(
      "id,author_id,alias,body,photo_url,media_kind,clip_start,clip_end,feels,wilds,featured,seed,aftermath,nsfw,author_gender,author_age,author_location,font_style,text_fx,view_3d,created_at,author:profiles!confessions_author_id_fkey(emoji_key,alias,username)"
    )
    .in("id", ids);
  if (!data) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  return signMediaList(
    data
      .map(rowToConfession)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  );
}

// --- Matchmaking ------------------------------------------------------------

export interface UserMatch {
  userId: string;
  username: string | null;
  alias: string;
  /** Co-Vyb count (posts you both loved). */
  shared: number;
  /** Co-Fail count (posts you both rejected) — a shared-taste signal. */
  sharedDislikes: number;
  /** Times your reactions opposed (one Vyb, one Fail). */
  disagreements: number;
  /** Count of overlapping declared interests. */
  sharedInterests: number;
  /** Count of overlapping intent ("looking for"). */
  sharedIntent: number;
  /** The actual overlapping interest labels (for "you both love …"). */
  sharedInterestNames: string[];
  /** Blended 0..1 compatibility (behaviour + declared signals). */
  affinity: number;
  /** 0..1 semantic similarity of your profiles (0 when no embedding yet). */
  resonance: number;
}

/**
 * Multi-signal matchmaking: people whose taste overlaps yours most, blending
 * co-Vybs, co-Fails (shared dislikes), and a disagreement penalty. Tolerant of
 * the v1 RPC shape (older deploys lack the dislike/disagreement columns).
 */
export async function fetchUserMatches(limit = 12): Promise<UserMatch[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("user_matches", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    username: r.username ?? null,
    alias: r.alias,
    shared: r.shared ?? 0,
    sharedDislikes: r.shared_dislikes ?? 0,
    disagreements: r.disagreements ?? 0,
    sharedInterests: r.shared_interests ?? 0,
    sharedIntent: r.shared_intent ?? 0,
    sharedInterestNames: (r.shared_interest_names as string[] | null) ?? [],
    affinity: Number(r.affinity ?? 0),
    resonance: Number(r.resonance ?? 0),
  }));
}

// --- Collab matchmaking (VYBZ Phase 2) — complementary-role engine ----------

export interface CollabMatch {
  userId: string;
  username: string | null;
  alias: string;
  /** Role labels THEY offer that YOU seek (forward complement). */
  offersYouSeek: string[];
  /** Role labels THEY seek that YOU offer (backward complement). */
  seeksYouOffer: string[];
  /** True when both directions are present — a two-way fit (the gold standard). */
  mutual: boolean;
  shared_genres: string[];
  shared_daws: string[];
  shared_plugins: string[];
  openToWork: boolean;
  /** 0..1 semantic resonance. */
  resonance: number;
  /** 0..1 blended fit. */
  fit: number;
}

/**
 * Complementary-collaborator matches: candidates who offer what you seek and/or
 * seek what you offer, blended with genre/DAW/plugin/tempo overlap + semantic
 * resonance. Returns the "why" so the UI can explain every match.
 */
export async function fetchCollabMatches(limit = 24): Promise<CollabMatch[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("collab_matches", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    username: r.username ?? null,
    alias: r.alias,
    offersYouSeek: (r.offers_you_seek as string[] | null) ?? [],
    seeksYouOffer: (r.seeks_you_offer as string[] | null) ?? [],
    mutual: !!r.mutual,
    shared_genres: (r.shared_genres as string[] | null) ?? [],
    shared_daws: (r.shared_daws as string[] | null) ?? [],
    shared_plugins: (r.shared_plugins as string[] | null) ?? [],
    openToWork: !!r.open_to_work,
    resonance: Number(r.resonance ?? 0),
    fit: Number(r.fit ?? 0),
  }));
}

/**
 * Recompute the caller's semantic profile vector server-side (fire-and-forget).
 * Powers the "resonance" term in user_matches + Companion memory. No-ops cleanly
 * when no OpenAI key is configured; matchmaking still works without it.
 */
export async function refreshProfileEmbedding(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("embed", { body: {} });
  } catch {
    /* best-effort */
  }
}

// --- Never Alone: ambient presence -----------------------------------------

/**
 * One cheap round-trip the client polls to learn how alive MYVYB is for the
 * current user right now. Also stamps the caller's last_active_at server-side,
 * so simply polling keeps them in the "online" set. Returns null when the
 * backend is off (the client then shows a calm, neutral state).
 */
export async function fetchAmbientPresence(): Promise<AmbientPresence | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("ambient_presence");
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (Array.isArray(data) ? data[0] : data) as any;
  if (!r) return null;
  return {
    online: Number(r.online ?? 0),
    live: Number(r.live ?? 0),
    roulette: Number(r.roulette ?? 0),
    lifelines: Number(r.lifelines ?? 0),
    layer: r.layer === "teen" ? "teen" : "adult",
  };
}

// --- Never Alone: AI companions --------------------------------------------

/** Companions the current user is allowed to talk to (age + NSFW aware). */
export async function fetchCompanions(): Promise<Companion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_companions");
  if (error || !Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((c) => ({
    id: String(c.id),
    slug: String(c.slug),
    name: String(c.name),
    tagline: String(c.tagline ?? ""),
    emoji: String(c.emoji ?? "✨"),
    accent: String(c.accent ?? "#6366f1"),
    nsfw: Boolean(c.nsfw),
  }));
}

/** Past conversation with one companion (oldest → newest). */
export async function fetchCompanionHistory(
  companionId: string,
  limit = 40
): Promise<CompanionMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("companion_history", {
    p_companion: companionId,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
    t: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
  }));
}

export interface CompanionReply {
  /** The companion's reply, or null when rate-limited. */
  reply: string | null;
  /** When set, the client should surface a Lifeline + 988 handoff. */
  handoff?: "lifeline";
  /** True when the free daily allowance is used up. */
  limited?: boolean;
  /** True when the request failed (network/backend). */
  error?: boolean;
}

/** Send one message to a companion; the Edge Function stores both turns. */
export async function sendCompanionMessage(
  companionId: string,
  text: string
): Promise<CompanionReply> {
  if (!supabase) return { reply: null, error: true };
  const { data, error } = await supabase.functions.invoke("companion-chat", {
    body: { companion_id: companionId, text },
  });
  if (error || !data) return { reply: null, error: true };
  const d = data as { reply?: string | null; handoff?: "lifeline"; limited?: boolean };
  return {
    reply: d.reply ?? null,
    handoff: d.handoff,
    limited: Boolean(d.limited),
  };
}

// --- Echoes (opt-in AI of a real member) -----------------------------------

/** The version string stamped when a user consents to enabling their Echo. */
export const ECHO_CONSENT_VERSION = "2026-06-28";

/** Owner: read my Echo config (null when I've never set one up). */
export async function fetchMyEcho(): Promise<EchoConfig | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("echo_get");
  if (error || !Array.isArray(data) || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data[0] as any;
  return {
    enabled: Boolean(r.enabled),
    displayName: String(r.display_name ?? ""),
    tone: (r.tone ?? "warm") as EchoConfig["tone"],
    greeting: String(r.greeting ?? ""),
    bioSeed: String(r.bio_seed ?? ""),
    consentAt: r.consent_at ?? null,
  };
}

/** Owner: create / update my Echo (records consent when enabling). */
export async function saveMyEcho(cfg: {
  enabled: boolean;
  displayName: string;
  tone: string;
  greeting: string;
  bioSeed: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("echo_upsert", {
    p_enabled: cfg.enabled,
    p_display_name: cfg.displayName,
    p_tone: cfg.tone,
    p_greeting: cfg.greeting,
    p_bio_seed: cfg.bioSeed,
    p_consent_version: ECHO_CONSENT_VERSION,
  });
  return !error;
}

/** Owner: quick enable/disable. */
export async function setMyEchoEnabled(enabled: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("echo_set_enabled", { p_enabled: enabled });
  return !error;
}

/** Owner: permanently delete my Echo + all its conversations. */
export async function deleteMyEcho(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("echo_delete");
  return !error;
}

/** Visitor: is this user's Echo available to me right now? */
export async function fetchEchoPublic(userId: string): Promise<EchoPublic | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("echo_public", { p_user: userId });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data[0] as any;
  if (!r.enabled) return null;
  return {
    owner: String(r.owner),
    displayName: String(r.display_name ?? ""),
    tone: String(r.tone ?? "warm"),
    greeting: String(r.greeting ?? ""),
    enabled: true,
  };
}

/** Visitor: my conversation with a given Echo (oldest → newest). */
export async function fetchEchoHistory(
  ownerId: string,
  limit = 40
): Promise<CompanionMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("echo_history", {
    p_owner: ownerId,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
    t: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
  }));
}

/** Visitor: send one message to a member's Echo. */
export async function sendEchoMessage(
  ownerId: string,
  text: string
): Promise<CompanionReply> {
  if (!supabase) return { reply: null, error: true };
  const { data, error } = await supabase.functions.invoke("echo-chat", {
    body: { owner_id: ownerId, text },
  });
  if (error || !data) return { reply: null, error: true };
  const d = data as { reply?: string | null; handoff?: "lifeline"; limited?: boolean };
  return { reply: d.reply ?? null, handoff: d.handoff, limited: Boolean(d.limited) };
}

/** Owner: people who've chatted with my Echo (for transcript review). */
export async function fetchEchoVisitors(): Promise<EchoVisitor[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("echo_visitors");
  if (error || !Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    visitorId: String(r.visitor_id),
    username: r.username ?? null,
    alias: String(r.alias ?? ""),
    lastAt: r.last_at ? new Date(r.last_at).getTime() : 0,
    msgs: Number(r.msgs ?? 0),
  }));
}

/** Owner: full transcript with one visitor. */
export async function fetchEchoTranscript(
  visitorId: string,
  limit = 80
): Promise<CompanionMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("echo_transcript", {
    p_visitor: visitorId,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
    t: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
  }));
}

// --- Spark (dating) --------------------------------------------------------

export interface SparkCandidate {
  userId: string;
  username: string | null;
  alias: string;
  gender: string | null;
  age: number | null;
  location: string | null;
  details: ProfileDetails;
  sharedInterests: number;
  sharedInterestNames: string[];
  sameArea: boolean;
}

export interface SparkMatch {
  userId: string;
  username: string | null;
  alias: string;
  gender: string | null;
  age: number | null;
  location: string | null;
  details: ProfileDetails;
  matchedAt: number;
}

/** Swipe deck: discoverable people in your age layer, ranked by area + interests. */
export async function fetchDatingDeck(limit = 20): Promise<SparkCandidate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("dating_deck", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    username: r.username ?? null,
    alias: r.alias,
    gender: r.gender ?? null,
    age: r.age ?? null,
    location: r.location ?? null,
    details: (r.profile as ProfileDetails) ?? {},
    sharedInterests: r.shared_interests ?? 0,
    sharedInterestNames: (r.shared_interest_names as string[] | null) ?? [],
    sameArea: !!r.same_area,
  }));
}

/** Record a like/pass. Returns true when it created a mutual match. */
export async function sparkLike(targetId: string, like: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("spark_like", {
    p_target: targetId,
    p_like: like,
  });
  if (error || !data) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(data as any[])?.[0]?.matched;
}

/** Your mutual Spark matches. */
export async function fetchMySparks(limit = 50): Promise<SparkMatch[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_sparks", { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    username: r.username ?? null,
    alias: r.alias,
    gender: r.gender ?? null,
    age: r.age ?? null,
    location: r.location ?? null,
    details: (r.profile as ProfileDetails) ?? {},
    matchedAt: r.matched_at ? new Date(r.matched_at).getTime() : Date.now(),
  }));
}

export interface VoteStats {
  feelsGiven: number;
  wildsGiven: number;
  matches: number;
}

/** The caller's individual, curated voting metrics. */
export async function fetchMyVoteStats(): Promise<VoteStats> {
  if (!supabase) return { feelsGiven: 0, wildsGiven: 0, matches: 0 };
  const { data } = await supabase.rpc("my_vote_stats");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any[] | null)?.[0];
  return {
    feelsGiven: row?.feels_given ?? 0,
    wildsGiven: row?.wilds_given ?? 0,
    matches: row?.matches ?? 0,
  };
}

// --- Admin / operator -------------------------------------------------------

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  alias: string;
  username: string | null;
  godmode: boolean;
  banned: boolean;
  anonymous: boolean;
  gender: "M" | "F" | null;
  age: number | null;
  credits: number;
}

/** Bootstrap: claim the admin role with a one-time code. */
export async function claimAdmin(code: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("claim_admin", { p_code: code });
  return !error && data === true;
}

export async function adminListReports(): Promise<ReportRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("reports")
    .select("id,reporter_id,target_type,target_id,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as ReportRow[]) ?? [];
}

export interface AdminStats {
  total: number;
  members: number;
  guests: number;
}

/** Operator dashboard: guest→member conversion counts (admin-gated). */
export async function fetchAdminStats(): Promise<AdminStats> {
  if (!supabase) return { total: 0, members: 0, guests: 0 };
  const { data } = await supabase.rpc("admin_stats");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[] | null)?.[0];
  return { total: r?.total ?? 0, members: r?.members ?? 0, guests: r?.guests ?? 0 };
}

/** Search any registered account by username / alias / id (admin-gated). */
export async function adminSearchUsers(query: string): Promise<AdminUserRow[]> {
  if (!supabase) return [];
  // Admin-gated SECURITY DEFINER read (gender/age are locked from direct SELECT).
  const { data } = await supabase.rpc("admin_list_users", {
    p_query: query.trim(),
    p_limit: 30,
  });
  return (data as AdminUserRow[]) ?? [];
}

export async function adminSetGodmode(userId: string, on: boolean): Promise<void> {
  await supabase?.rpc("admin_set_godmode", { p_user: userId, p_on: on });
}
export async function adminSetBanned(userId: string, on: boolean): Promise<void> {
  await supabase?.rpc("admin_set_banned", { p_user: userId, p_on: on });
}
export async function adminSetHidden(confessionId: string, on: boolean): Promise<void> {
  await supabase?.rpc("admin_set_hidden", { p_confession: confessionId, p_on: on });
}
export async function adminChangeIdentity(
  userId: string,
  gender: "M" | "F" | null,
  age: number | null
): Promise<void> {
  await supabase?.rpc("admin_change_identity", { p_user: userId, p_gender: gender, p_age: age });
}
export async function adminGrantIdentityChange(userId: string, n: number): Promise<void> {
  await supabase?.rpc("admin_grant_identity_change", { p_user: userId, p_n: n });
}

/** Issue V¢ directly to (or deduct from, with a negative amount) any wallet. */
export async function adminGrantCredits(
  userId: string,
  amount: number,
  note?: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("admin_grant_credits", {
    p_user: userId,
    p_amount: Math.round(amount),
    p_note: note ?? null,
  });
  return !error && data === true;
}

/** Read any user's current V¢ balance (admin-gated). */
export async function adminUserCredits(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("admin_user_credits", { p_user: userId });
  return (data as number) ?? 0;
}

// --- Feedback / bug report / contact admin ---------------------------------

export type FeedbackCategory = "bug" | "feature" | "help" | "other";

export interface FeedbackRow {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  body: string;
  contact: string | null;
  user_agent: string | null;
  url: string | null;
  status: "open" | "in_progress" | "resolved";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** Submit a piece of feedback (works for guests too — user_id is nullable). */
export async function submitFeedback(input: {
  category: FeedbackCategory;
  body: string;
  contact?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("submit_feedback", {
    p_category: input.category,
    p_body: input.body,
    p_contact: input.contact ?? null,
    p_url: typeof window !== "undefined" ? window.location.href : null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  return !error && data === true;
}

/** Admin: list feedback by status. */
export async function adminListFeedback(
  status: "open" | "in_progress" | "resolved" | "all" = "open"
): Promise<FeedbackRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc("admin_list_feedback", {
    p_status: status,
    p_limit: 100,
  });
  return (data as FeedbackRow[]) ?? [];
}

/** Admin: change a feedback item's status / add a note. */
export async function adminResolveFeedback(
  id: string,
  status: "open" | "in_progress" | "resolved",
  note?: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("admin_resolve_feedback", {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
  return !error && data === true;
}

export async function adminCreatePost(input: {
  authorId: string;
  body: string;
  photo?: string | null;
  nsfw?: boolean;
  ai?: boolean;
  publishAt?: string | null;
  seed?: number;
}): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("admin_create_post", {
    p_author: input.authorId,
    p_body: input.body,
    p_photo: input.photo ?? null,
    p_nsfw: input.nsfw ?? false,
    p_ai: input.ai ?? false,
    p_publish_at: input.publishAt ?? null,
    p_seed: input.seed ?? null,
  });
  return (data as string) ?? null;
}

// --- Public profiles --------------------------------------------------------

export interface PublicProfile {
  id: string;
  alias: string;
  username: string | null;
  emojiKey: string | null;
  aura: string;
  godmode: boolean;
  identityPublic: boolean;
  gender: "M" | "F" | null;
  age: number | null;
  location: string | null;
  loadout: Record<string, string>;
  musicUrl: string | null;
  /** Personalized profile imagery (from prefs). */
  avatarUrl: string | null;
  bannerUrl: string | null;
  /** Public (privacy-sanitized) rich profile data points. */
  details: ProfileDetails;
  /** Offered role labels (VYBZ) — public by design. */
  offers: string[];
  /** Sought role labels (VYBZ) — public by design. */
  seeks: string[];
  createdAt: number;
  /** Aggregate stats. */
  posts: number;
  feels: number;
}

/** Fetch a user's public profile + aggregate stats. World-readable. */
export async function fetchPublicProfile(id: string): Promise<PublicProfile | null> {
  if (!supabase) return null;
  // SECURITY DEFINER read: returns gender/age/location only when identity_public.
  const { data: rows } = await supabase.rpc("public_profile", { p_id: id });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = ((rows as any[] | null) ?? [])[0];
  if (!p) return null;
  const pub = p.identity_public ?? true;
  const { data: posts } = await supabase
    .from("confessions")
    .select("feels")
    .eq("author_id", id)
    .eq("hidden", false)
    .eq("archived", false);
  const list = (posts as { feels: number }[] | null) ?? [];
  const roles = await fetchCreatorRolesFor(id);
  return {
    id: p.id,
    alias: p.alias,
    username: p.username ?? null,
    emojiKey: p.emoji_key ?? null,
    aura: p.aura,
    godmode: !!p.godmode,
    identityPublic: pub,
    gender: pub ? p.gender ?? null : null,
    age: pub ? p.age ?? null : null,
    location: pub ? p.location ?? null : null,
    loadout: (p.cosmetic_loadout as Record<string, string>) ?? {},
    musicUrl: p.music_url ?? null,
    avatarUrl: (p.prefs?.avatarUrl as string | null) ?? null,
    bannerUrl: (p.prefs?.bannerUrl as string | null) ?? null,
    // Already privacy-sanitized server-side (public_profile strips hidden keys).
    details: (p.profile as ProfileDetails | null) ?? {},
    offers: roles.offers,
    seeks: roles.seeks,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    posts: list.length,
    feels: list.reduce((s, r) => s + (r.feels ?? 0), 0),
  };
}

// --- Author-targeted notifications -----------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(r: any): AppNotification {
  return {
    id: r.id,
    kind: (r.kind as NotificationKind) ?? "vote",
    title: r.title ?? "",
    body: r.body ?? "",
    confessionId: r.confession_id ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    read: !!r.read,
  };
}

/** The caller's stored notifications (newest first). */
export async function fetchNotifications(myId: string, limit = 50): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id,kind,title,body,confession_id,actor_id,created_at,read")
    .eq("user_id", myId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as unknown[]) ?? []).map(mapNotification);
}

export async function markNotificationsRead(myId: string): Promise<void> {
  await supabase?.from("notifications").update({ read: true }).eq("user_id", myId).eq("read", false);
}

/** Live per-user notification stream (RLS scopes it to the caller). */
export function subscribeNotifications(
  myId: string,
  onNew: (n: AppNotification) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`notifications:${myId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${myId}` },
      (payload) => onNew(mapNotification(payload.new))
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- MYVYB Roulette (random 1:1 ephemeral chat) ---------------------------

export interface RouletteMatch {
  sessionId: string;
  partnerId: string;
}

/** Join the pool or pair with a waiting partner (server enforces age-layer). */
export async function rouletteEnqueue(nsfw = false): Promise<{
  match: RouletteMatch | null;
  waiting: boolean;
  eligible: boolean;
}> {
  if (!supabase) return { match: null, waiting: false, eligible: false };
  const { data, error } = await supabase.rpc("roulette_enqueue", { p_nsfw: nsfw });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any[] | null)?.[0];
  if (error || !row) return { match: null, waiting: false, eligible: false };
  return {
    match: row.session_id ? { sessionId: row.session_id, partnerId: row.partner_id } : null,
    waiting: !!row.waiting,
    eligible: !!row.eligible,
  };
}

export async function rouletteCancel(): Promise<void> {
  await supabase?.rpc("roulette_cancel");
}

/** Presence on the Random lobby — how many people are here right now. */
export function joinRoulettePresence(meId: string, onCount: (n: number) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel("roulette-lobby", {
    config: { presence: { key: meId } },
  });
  channel
    .on("presence", { event: "sync" }, () => {
      onCount(Object.keys(channel.presenceState()).length);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
    });
  return () => {
    supabase?.removeChannel(channel);
  };
}

export async function rouletteEnd(sessionId: string): Promise<void> {
  await supabase?.rpc("roulette_end", { p_session: sessionId });
}

/** Fallback poll: the active (unended) session involving me, if any. */
export async function fetchActiveRoulette(myId: string): Promise<RouletteMatch | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("roulette_sessions")
    .select("id,a,b")
    .is("ended_at", null)
    .or(`a.eq.${myId},b.eq.${myId}`)
    .order("created_at", { ascending: false })
    .limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any[] | null)?.[0];
  if (!row) return null;
  return { sessionId: row.id, partnerId: row.a === myId ? row.b : row.a };
}

/** The waiting partner's signal that a session was just created for them. */
export function subscribeRouletteMatch(
  myId: string,
  onMatch: (m: RouletteMatch) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`roulette-watch:${myId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "roulette_sessions" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        const n = payload.new ?? {};
        if (n.a === myId || n.b === myId)
          onMatch({ sessionId: n.id, partnerId: n.a === myId ? n.b : n.a });
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

export interface RouletteMsg {
  from: string;
  text: string;
  t: number;
}

/** Ephemeral, text-only broadcast room for a paired session (never stored). */
export function joinRouletteRoom(
  sessionId: string,
  meId: string,
  onMsg: (m: RouletteMsg) => void,
  onEnd: () => void
): { send: (text: string) => void; leave: (announce?: boolean) => void } {
  if (!supabase) return { send: () => {}, leave: () => {} };
  const channel = supabase.channel(`roulette:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on("broadcast", { event: "msg" }, (p: { payload: RouletteMsg }) => {
      if (p.payload) onMsg(p.payload);
    })
    .on("broadcast", { event: "end" }, () => onEnd())
    .subscribe();
  return {
    send: (text: string) => {
      void channel.send({
        type: "broadcast",
        event: "msg",
        payload: { from: meId, text, t: Date.now() },
      });
    },
    leave: (announce = true) => {
      if (announce) void channel.send({ type: "broadcast", event: "end", payload: {} });
      supabase?.removeChannel(channel);
    },
  };
}

/** A user's public confessions (newest first). */
export async function fetchUserConfessions(authorId: string, limit = 40): Promise<Confession[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("confessions")
    .select(
      "id,author_id,alias,body,photo_url,media_kind,clip_start,clip_end,feels,wilds,featured,seed,aftermath,nsfw,author_gender,author_age,author_location,font_style,text_fx,view_3d,created_at,author:profiles!confessions_author_id_fkey(emoji_key,alias,username)"
    )
    .eq("author_id", authorId)
    .eq("hidden", false)
    .eq("archived", false)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return signMediaList((data ?? []).map(rowToConfession));
}

/** Update the current user's equipped cosmetics (RLS: self). */
export async function updateLoadout(
  userId: string,
  loadout: Record<string, string>
): Promise<void> {
  await supabase?.from("profiles").update({ cosmetic_loadout: loadout }).eq("id", userId);
}

/** Update the current user's profile music link (RLS: self). */
export async function setMusicUrl(userId: string, url: string | null): Promise<void> {
  await supabase?.from("profiles").update({ music_url: url }).eq("id", userId);
}

/**
 * Persist account-synced personalization (RLS: self). Best-effort — failures
 * leave localStorage as the source of truth, so it never blocks the UI.
 */
export async function savePrefs(userId: string, prefs: UserPrefs): Promise<void> {
  try {
    await supabase?.from("profiles").update({ prefs }).eq("id", userId);
  } catch {
    // Non-fatal.
  }
}

// --- V¢ (V-Credits) ---------------------------------------------------------

export interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  ref: string | null;
  created_at: string;
}
export interface CosmeticRow {
  item_id: string;
  name: string;
  kind: string;
  price: number;
}

/** Current V¢ balance for a user. */
export async function fetchCredits(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();
  return (data as { credits?: number } | null)?.credits ?? 0;
}

export async function fetchLedger(limit = 20): Promise<LedgerRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("credit_ledger")
    .select("id,delta,reason,ref,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as LedgerRow[]) ?? [];
}

/** Claim today's gentle bonus. Returns the amount granted (0 if already claimed). */
export async function claimDailyBonus(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("claim_daily_bonus");
  return (data as number) ?? 0;
}

/** Tip another user V¢ from their post or profile. */
export async function tipCredits(
  toUserId: string,
  amount: number,
  ref?: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("tip_credits", {
    p_to: toUserId,
    p_amount: amount,
    p_ref: ref ?? null,
  });
  return !error && data === true;
}

export async function fetchCosmetics(): Promise<CosmeticRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("cosmetics")
    .select("item_id,name,kind,price")
    .order("price", { ascending: true });
  return (data as CosmeticRow[]) ?? [];
}

export async function fetchOwnedCosmetics(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("cosmetics_owned").select("item_id");
  return (data ?? []).map((r) => (r as { item_id: string }).item_id);
}

export async function buyCosmetic(itemId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("buy_cosmetic", { p_item: itemId });
  return !error && data === true;
}

/**
 * Spend V¢ on a one-off (e.g. a post's premium text effects). Server-validated
 * via the `spend_credits` RPC; returns false when the wallet is short. No-op in
 * local mode (the client balance is authoritative there).
 */
export async function spendCredits(
  amount: number,
  reason?: string
): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc("spend_credits", {
    p_amount: amount,
    p_reason: reason ?? null,
  });
  return !error && data === true;
}

/** The user's own one-time age/sex change. Returns false if no credit left. */
export async function selfChangeIdentity(
  gender: "M" | "F" | null,
  age: number | null
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("self_change_identity", {
    p_gender: gender,
    p_age: age,
  });
  return !error && data === true;
}

// --- Safety: reports & blocks ----------------------------------------------

export async function reportContent(
  reporterId: string,
  targetType: "confession" | "comment" | "message" | "profile",
  targetId: string,
  reason?: string
): Promise<void> {
  if (!supabase) return;
  await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason: reason ?? null,
  });
}

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("blocks")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id" }
    );
}

export async function fetchBlocks(blockerId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId);
  return (data ?? []).map((r) => (r as { blocked_id: string }).blocked_id);
}

/** Insert a confession; returns its new id (the author is the current user). */
export async function createConfession(
  authorId: string,
  input: {
    text: string;
    photo?: string;
    /** 'image' (default) or 'video'. */
    mediaKind?: "image" | "video";
    /** Virtual-trim window (seconds) for video. */
    clipStart?: number;
    clipEnd?: number;
    /** Self-marked NSFW. */
    nsfw?: boolean;
    seed: number;
    /** Ephemeral, anonymous per-post display name (not the emoji identity). */
    alias: string;
    /** Identity snapshot to attach (only when the author's profile is public). */
    identity?: Identity;
    /** Typography choice (free). */
    fontStyle?: string;
    /** Premium text effect id (V¢ / Godmode). */
    textFx?: string;
    /** Premium 3D gyroscopic media view (V¢ / Godmode). */
    view3d?: boolean;
  }
): Promise<string | null> {
  if (!supabase) return null;
  const idn = input.identity;
  const { data, error } = await supabase
    .from("confessions")
    .insert({
      author_id: authorId,
      alias: input.alias,
      body: input.text,
      photo_url: input.photo ?? null,
      media_kind: input.mediaKind ?? "image",
      clip_start: input.clipStart ?? null,
      clip_end: input.clipEnd ?? null,
      seed: input.seed,
      nsfw: input.nsfw ?? false,
      author_gender: idn?.gender ?? null,
      author_age: idn?.age ?? null,
      author_location: idn?.location ?? null,
      font_style: input.fontStyle ?? null,
      text_fx: input.textFx ?? null,
      view_3d: input.view3d ?? false,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/** Ask the moderation function whether an image is likely NSFW (suggestion only). */
export async function moderateImage(imageUrl: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", {
      body: { imageUrl },
    });
    if (error) return false;
    return Boolean((data as { nsfw?: boolean })?.nsfw);
  } catch {
    return false;
  }
}

/** Persist the user's global NSFW opt-in to their profile. */
export async function setNsfwOptIn(userId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from("profiles").update({ nsfw_opt_in: on }).eq("id", userId);
}

/** Record the user's 18+ consent (part of the NSFW unlock gate). */
export async function setNsfwConsent(userId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from("profiles").update({ nsfw_consent: on }).eq("id", userId);
}

/**
 * Whether the account has a VERIFIED contact (a confirmed email — or, once an
 * SMS provider is configured, a confirmed phone). This is the "magic-link login
 * verification" half of the NSFW gate. Anonymous accounts return false.
 */
export async function hasVerifiedContact(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return false;
  const emailVerified = Boolean(u.email && (u.email_confirmed_at || u.confirmed_at));
  const phoneVerified = Boolean(u.phone && u.phone_confirmed_at);
  return emailVerified || phoneVerified;
}

/** Stamp the account as active (resets the weekly-inactivity countdown). */
export async function touchActivity(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);
}

/**
 * Un-Veil a returning account: restore its archived content and reclaim its
 * emoji name if it's still free. Gated by the caller to recoverable (email-
 * linked) Godmode members only. Returns true if a name was reclaimed.
 */
export async function reactivateAccount(
  userId: string,
  emojiKey: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("confessions")
    .update({ archived: false })
    .eq("author_id", userId)
    .eq("archived", true);
  if (emojiKey && (await isEmojiAvailable(emojiKey, userId))) {
    await supabase
      .from("profiles")
      .update({ emoji_key: emojiKey })
      .eq("id", userId);
  }
}

/** Subscribe to newly posted confessions (fires a callback on each insert). */
export function subscribeConfessions(onInsert: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("confessions-feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "confessions" },
      () => onInsert()
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- Realtime DMs ----------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToMessage(r: any, myId: string): Message {
  return {
    id: r.id,
    confessionId: r.confession_id,
    from: r.sender_id === myId ? "me" : "them",
    text: r.body,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** A 1:1 thread between the current user and a specific peer on a confession. */
export async function fetchThread(
  confessionId: string,
  myId: string,
  peerId: string
): Promise<Message[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id,confession_id,sender_id,recipient_id,body,created_at")
    .eq("confession_id", confessionId)
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${myId})`
    )
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToMessage(r, myId));
}

export interface Conversation {
  confessionId: string;
  peerId: string;
  peerAlias: string;
  snippet: string;
  lastMessage: string;
  lastAt: number;
  fromMe: boolean;
}

/** All 1:1 conversations the current user is part of (newest first). */
export async function fetchInbox(myId: string): Promise<Conversation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select(
      "confession_id,sender_id,recipient_id,body,created_at," +
        "sender:profiles!messages_sender_id_fkey(alias)," +
        "recipient:profiles!messages_recipient_id_fkey(alias)," +
        "confession:confessions!messages_confession_id_fkey(body)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  const seen = new Set<string>();
  const out: Conversation[] = [];
  for (const r of data as any[]) {
    const fromMe = r.sender_id === myId;
    const peerId = fromMe ? r.recipient_id : r.sender_id;
    if (!peerId) continue;
    const key = `${r.confession_id}:${peerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const peerNode = fromMe ? r.recipient : r.sender;
    const peer = (Array.isArray(peerNode) ? peerNode[0] : peerNode) ?? {};
    const conf = (Array.isArray(r.confession) ? r.confession[0] : r.confession) ?? {};
    out.push({
      confessionId: r.confession_id,
      peerId,
      peerAlias: peer.alias ?? "Anonymous",
      snippet: conf.body ?? "",
      lastMessage: r.body,
      lastAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      fromMe,
    });
  }
  return out;
}

export async function sendThreadMessage(
  confessionId: string,
  senderId: string,
  recipientId: string | null,
  body: string
): Promise<void> {
  if (!supabase) return;
  await supabase.from("messages").insert({
    confession_id: confessionId,
    sender_id: senderId,
    recipient_id: recipientId,
    body,
  });
}

// --- Unveils, reactions, comments ------------------------------------------

/** Record that the current user unveiled a confession (gates the thread). */
export async function recordUnveil(
  confessionId: string,
  userId: string
): Promise<void> {
  if (!supabase || !isBackendId(confessionId)) return;
  await supabase
    .from("unveils")
    .upsert(
      { confession_id: confessionId, user_id: userId },
      { onConflict: "confession_id,user_id" }
    );
}

/** Record / change the current user's reaction on a confession. */
export async function recordReaction(
  confessionId: string,
  userId: string,
  reaction: Reaction
): Promise<void> {
  if (!supabase || !isBackendId(confessionId)) return;
  await supabase
    .from("reactions")
    .upsert(
      { confession_id: confessionId, user_id: userId, reaction },
      { onConflict: "confession_id,user_id" }
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToComment(r: any, myId: string): Comment {
  const author = (Array.isArray(r.author) ? r.author[0] : r.author) ?? {};
  return {
    id: `${r.confession_id}:${r.user_id}`,
    confessionId: r.confession_id,
    author: r.user_id === myId ? "You" : author.alias ?? "Anonymous",
    username: author.username ?? undefined,
    text: r.body,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    mine: r.user_id === myId,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchComments(
  confessionId: string,
  myId: string
): Promise<Comment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select(
      "confession_id,user_id,body,created_at,author:profiles!comments_user_id_fkey(alias,username)"
    )
    .eq("confession_id", confessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToComment(r, myId));
}

export interface CommentTally {
  vybs: number;
  fails: number;
  mine: "vyb" | "fail" | null;
}

/** Community vote tallies for every comment on a confession, keyed by comment id. */
export async function fetchCommentTallies(
  confessionId: string
): Promise<Record<string, CommentTally>> {
  if (!supabase) return {};
  const { data } = await supabase.rpc("comment_tallies", { p_confession: confessionId });
  const out: Record<string, CommentTally> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data as any[] | null) ?? []) {
    out[`${confessionId}:${r.comment_user_id}`] = {
      vybs: r.vybs ?? 0,
      fails: r.fails ?? 0,
      mine: (r.mine as "vyb" | "fail" | null) ?? null,
    };
  }
  return out;
}

/** Cast (or clear) a vote on a comment. Pass null to remove your vote. */
export async function voteComment(
  confessionId: string,
  commentUserId: string,
  voterId: string,
  reaction: "vyb" | "fail" | null
): Promise<void> {
  if (!supabase) return;
  if (reaction === null) {
    await supabase
      .from("comment_votes")
      .delete()
      .eq("confession_id", confessionId)
      .eq("comment_user_id", commentUserId)
      .eq("voter_id", voterId);
    return;
  }
  await supabase.from("comment_votes").upsert(
    { confession_id: confessionId, comment_user_id: commentUserId, voter_id: voterId, reaction },
    { onConflict: "confession_id,comment_user_id,voter_id" }
  );
}

/** Add a comment. Returns false if the user already commented (PK conflict). */
export async function addBackendComment(
  confessionId: string,
  userId: string,
  body: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("comments")
    .insert({ confession_id: confessionId, user_id: userId, body });
  return !error;
}

export function subscribeComments(
  confessionId: string,
  myId: string,
  onComment: (c: Comment) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`comments:${confessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `confession_id=eq.${confessionId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onComment(rowToComment(payload.new, myId))
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

/** Subscribe to new messages on a confession thread. Returns an unsubscribe fn. */
export function subscribeThread(
  confessionId: string,
  myId: string,
  peerId: string,
  onMessage: (m: Message) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`thread:${confessionId}:${peerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `confession_id=eq.${confessionId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        const n = payload.new;
        const between =
          (n.sender_id === myId && n.recipient_id === peerId) ||
          (n.sender_id === peerId && n.recipient_id === myId);
        if (between) onMessage(rowToMessage(n, myId));
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- Typing indicator (1:1 thread) -----------------------------------------

export interface TypingChannel {
  sendTyping: () => void;
  unsubscribe: () => void;
}

/** A broadcast channel for "typing…" between two participants on a confession. */
export function createTypingChannel(
  confessionId: string,
  myId: string,
  peerId: string,
  onPeerTyping: () => void
): TypingChannel {
  if (!supabase) return { sendTyping: () => {}, unsubscribe: () => {} };
  const pair = [myId, peerId].sort().join("-");
  const channel = supabase.channel(`typing:${confessionId}:${pair}`);
  channel
    .on("broadcast", { event: "typing" }, (payload) => {
      if (payload?.payload?.from === peerId) onPeerTyping();
    })
    .subscribe();
  return {
    sendTyping: () => {
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { from: myId },
      });
    },
    unsubscribe: () => {
      supabase?.removeChannel(channel);
    },
  };
}

// --- Direct friend DMs (no confession) -------------------------------------

/** The 1:1 direct-message thread between the user and a friend. */
export async function fetchFriendThread(
  myId: string,
  peerId: string
): Promise<Message[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id,confession_id,sender_id,recipient_id,body,created_at")
    .is("confession_id", null)
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${myId})`
    )
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToMessage(r, myId));
}

export async function sendFriendMessage(
  myId: string,
  peerId: string,
  body: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("messages").insert({
    confession_id: null,
    sender_id: myId,
    recipient_id: peerId,
    body,
  });
  return !error;
}

/**
 * Global subscription to incoming friend DMs (any peer) addressed to the user,
 * used to raise notifications when the relevant chat isn't open. Resolves the
 * sender's alias/aura for a friendly notification.
 */
export function subscribeIncomingDMs(
  myId: string,
  onMessage: (
    m: Message & { peerId: string; peerAlias: string; peerAura: string }
  ) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`dm-inbox:${myId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `recipient_id=eq.${myId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (payload: any) => {
        const n = payload.new;
        if (n.confession_id || n.sender_id === myId) return; // friend DMs only
        let peerAlias = "A friend";
        let peerAura = "veil";
        if (supabase) {
          const { data } = await supabase
            .from("profiles")
            .select("alias,aura")
            .eq("id", n.sender_id)
            .maybeSingle();
          if (data) {
            peerAlias = (data as { alias: string }).alias ?? peerAlias;
            peerAura = (data as { aura: string }).aura ?? peerAura;
          }
        }
        onMessage({
          ...rowToMessage(n, myId),
          peerId: n.sender_id,
          peerAlias,
          peerAura,
        });
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

export function subscribeFriendThread(
  myId: string,
  peerId: string,
  onMessage: (m: Message) => void
): () => void {
  if (!supabase) return () => {};
  const pair = [myId, peerId].sort().join("-");
  const channel = supabase
    .channel(`dm:${pair}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        const n = payload.new;
        if (n.confession_id) return; // confession threads handled elsewhere
        const between =
          (n.sender_id === myId && n.recipient_id === peerId) ||
          (n.sender_id === peerId && n.recipient_id === myId);
        if (between) onMessage(rowToMessage(n, myId));
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- Friendships (profile-to-profile, real) --------------------------------

export interface BackendFriend {
  peerId: string;
  alias: string;
  aura: string;
  status: "requested" | "incoming" | "friends";
  since: number;
}

/** All of the current user's friendships, with derived per-peer status. */
export async function fetchFriendships(myId: string): Promise<BackendFriend[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select(
      "requester_id,addressee_id,status,created_at," +
        "requester:profiles!friendships_requester_id_fkey(alias,aura)," +
        "addressee:profiles!friendships_addressee_id_fkey(alias,aura)"
    )
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => {
    const iAmRequester = r.requester_id === myId;
    const peerId = iAmRequester ? r.addressee_id : r.requester_id;
    const peerNode = iAmRequester ? r.addressee : r.requester;
    const peer = (Array.isArray(peerNode) ? peerNode[0] : peerNode) ?? {};
    const status: BackendFriend["status"] =
      r.status === "friends"
        ? "friends"
        : iAmRequester
          ? "requested"
          : "incoming";
    return {
      peerId,
      alias: peer.alias ?? "Anonymous",
      aura: peer.aura ?? "veil",
      status,
      since: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    };
  });
}

export async function requestFriendship(
  myId: string,
  peerId: string
): Promise<void> {
  if (!supabase || myId === peerId) return;
  await supabase
    .from("friendships")
    .upsert(
      { requester_id: myId, addressee_id: peerId, status: "requested" },
      { onConflict: "requester_id,addressee_id" }
    );
}

/** Accept an incoming request (the peer is the requester). */
export async function acceptFriendship(
  myId: string,
  peerId: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("friendships")
    .update({ status: "friends" })
    .eq("requester_id", peerId)
    .eq("addressee_id", myId);
}

export async function removeFriendship(
  myId: string,
  peerId: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${peerId}),` +
        `and(requester_id.eq.${peerId},addressee_id.eq.${myId})`
    );
}

/** Refetch friendships whenever any row involving the user changes. */
export function subscribeFriendships(
  myId: string,
  onChange: () => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`friends:${myId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "friendships" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        const n = payload.new ?? payload.old ?? {};
        if (n.requester_id === myId || n.addressee_id === myId) onChange();
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- Public chat rooms ------------------------------------------------------

export async function fetchRooms(): Promise<Room[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,topic,kind,sort")
    .order("sort", { ascending: true });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    topic: r.topic ?? undefined,
    kind: r.kind,
    sort: r.sort ?? 0,
  }));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToRoomMessage(r: any, myId: string | null): RoomMessage {
  return {
    id: r.id,
    roomId: r.room_id,
    senderId: r.sender_id ?? null,
    senderKind: r.sender_kind ?? "user",
    alias: r.alias,
    aura: r.aura ?? "veil",
    body: r.body ?? undefined,
    imageUrl: r.image_url ?? undefined,
    nsfw: r.nsfw ?? undefined,
    unveils: r.unveils ?? 0,
    veils: r.veils ?? 0,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    mine: !!myId && r.sender_id === myId,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchRoomMessages(
  roomId: string,
  myId: string | null,
  limit = 80
): Promise<RoomMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_messages")
    .select(
      "id,room_id,sender_id,sender_kind,alias,aura,body,image_url,nsfw,unveils,veils,created_at"
    )
    .eq("room_id", roomId)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  // Returned newest-first for the limit; flip to chronological for display.
  return data.map((r) => rowToRoomMessage(r, myId)).reverse();
}

export async function sendRoomMessage(opts: {
  roomId: string;
  senderId: string;
  alias: string;
  aura: string;
  body?: string;
  imageUrl?: string;
  nsfw?: boolean;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("room_messages").insert({
    room_id: opts.roomId,
    sender_id: opts.senderId,
    sender_kind: "user",
    alias: opts.alias,
    aura: opts.aura,
    body: opts.body ?? null,
    image_url: opts.imageUrl ?? null,
    nsfw: opts.nsfw ?? false,
  });
  return !error;
}

export function subscribeRoomMessages(
  roomId: string,
  myId: string | null,
  onMessage: (m: RoomMessage) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${roomId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onMessage(rowToRoomMessage(payload.new, myId))
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

/** Record / change a reaction on a shared room image (drives its blur level). */
export async function recordRoomReaction(
  messageId: string,
  userId: string,
  reaction: Reaction
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("room_message_reactions")
    .upsert(
      { message_id: messageId, user_id: userId, reaction },
      { onConflict: "message_id,user_id" }
    );
}

/**
 * Join a room's presence channel to power the live "People (N)" list. Returns a
 * leave() that removes you from the channel. `onSync` fires with the current
 * roster whenever anyone joins or leaves.
 */
export function joinRoomPresence(
  roomId: string,
  me: RoomPresence,
  onSync: (people: RoomPresence[]) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel(`room-presence:${roomId}`, {
    config: { presence: { key: me.id } },
  });
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const people: RoomPresence[] = [];
      const seen = new Set<string>();
      for (const key of Object.keys(state)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = (state[key]?.[0] ?? {}) as any;
        const id = meta.id ?? key;
        if (seen.has(id)) continue;
        seen.add(id);
        people.push({
          id,
          alias: meta.alias ?? "Anonymous",
          aura: meta.aura ?? "veil",
          gender: meta.gender ?? undefined,
          age: meta.age ?? undefined,
          location: meta.location ?? undefined,
        });
      }
      onSync(people);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track(me);
    });
  return () => {
    supabase?.removeChannel(channel);
  };
}

// --- Social Circles ---------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToCircle(r: any): Circle {
  return {
    id: r.id,
    slug: r.slug ?? null,
    name: r.name,
    description: r.description ?? undefined,
    icon: r.icon ?? undefined,
    ownerId: r.owner_id,
    visibility: r.visibility,
    joinPolicy: r.join_policy,
    allowAnonymous: r.allow_anonymous,
    nsfw: r.nsfw,
    rules: r.rules ?? undefined,
    dues: r.dues ?? 0,
    theme: (r.theme as Record<string, string>) ?? {},
    memberCount: r.member_count ?? 0,
    nameChangesRemaining: r.name_changes_remaining ?? 0,
    lastActiveAt: r.last_active_at ? new Date(r.last_active_at).getTime() : Date.now(),
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}
function rowToCircleMessage(r: any, myId: string | null): CircleMessage {
  return {
    id: r.id,
    circleId: r.circle_id,
    senderId: r.sender_id ?? null,
    senderKind: r.sender_kind ?? "user",
    alias: r.alias,
    aura: r.aura ?? "veil",
    body: r.body ?? undefined,
    imageUrl: r.image_url ?? undefined,
    nsfw: r.nsfw ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    mine: !!myId && r.sender_id === myId,
  };
}
const CIRCLE_COLS =
  "id,slug,name,description,icon,owner_id,visibility,join_policy,allow_anonymous,nsfw,rules,dues,theme,member_count,name_changes_remaining,last_active_at,created_at";

/** Circles the user belongs to (owner or member). */
export async function fetchMyCircles(): Promise<Circle[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("circle_members")
    .select(`role,status,circle:circles(${CIRCLE_COLS})`)
    .eq("status", "active");
  return (data ?? [])
    .map((r: any) => r.circle)
    .filter(Boolean)
    .map(rowToCircle);
}

/** Public circles for discovery (most-active first). */
export async function fetchDiscoverCircles(query = ""): Promise<Circle[]> {
  if (!supabase) return [];
  let q = supabase
    .from("circles")
    .select(CIRCLE_COLS)
    .eq("visibility", "public")
    .order("last_active_at", { ascending: false })
    .limit(40);
  if (query.trim()) q = q.ilike("name", `%${query}%`);
  const { data } = await q;
  return (data ?? []).map(rowToCircle);
}

export async function fetchCircle(id: string): Promise<Circle | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("circles").select(CIRCLE_COLS).eq("id", id).maybeSingle();
  return data ? rowToCircle(data) : null;
}

/** The caller's role/status in a circle (null if not a member). */
export async function fetchMembership(
  circleId: string,
  userId: string
): Promise<{ role: string; status: string; supporter: boolean } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("circle_members")
    .select("role,status,supporter")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { role: string; status: string; supporter: boolean }) ?? null;
}

export async function fetchCircleMembers(circleId: string): Promise<CircleMember[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("circle_members")
    .select("user_id,role,status,profile:profiles(emoji_key,alias,username)")
    .eq("circle_id", circleId)
    .order("joined_at", { ascending: true });
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    role: r.role,
    status: r.status,
    alias: r.profile?.emoji_key ?? r.profile?.alias ?? "Anonymous",
    username: r.profile?.username ?? null,
  }));
}

export async function fetchCircleMessages(
  circleId: string,
  myId: string | null,
  limit = 80
): Promise<CircleMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("circle_messages")
    .select("id,circle_id,sender_id,sender_kind,alias,aura,body,image_url,nsfw,created_at")
    .eq("circle_id", circleId)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => rowToCircleMessage(r, myId)).reverse();
}

export function subscribeCircleMessages(
  circleId: string,
  myId: string | null,
  onMessage: (m: CircleMessage) => void,
  onUpdate?: (id: string, hidden: boolean) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`circle:${circleId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "circle_messages", filter: `circle_id=eq.${circleId}` },
      (payload: any) => onMessage(rowToCircleMessage(payload.new, myId))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "circle_messages", filter: `circle_id=eq.${circleId}` },
      (payload: any) => onUpdate?.(payload.new.id, !!payload.new.hidden)
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

export function joinCirclePresence(
  circleId: string,
  me: RoomPresence,
  onSync: (people: RoomPresence[]) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel(`circle-presence:${circleId}`, {
    config: { presence: { key: me.id } },
  });
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const people: RoomPresence[] = [];
      const seen = new Set<string>();
      for (const key of Object.keys(state)) {
        const meta = (state[key]?.[0] ?? {}) as any;
        const id = meta.id ?? key;
        if (seen.has(id)) continue;
        seen.add(id);
        people.push({
          id,
          alias: meta.alias ?? "Anonymous",
          aura: meta.aura ?? "veil",
          gender: meta.gender ?? undefined,
          age: meta.age ?? undefined,
          location: meta.location ?? undefined,
        });
      }
      onSync(people);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track(me);
    });
  return () => {
    supabase?.removeChannel(channel);
  };
}

export async function createCircle(name: string, description: string, icon: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("create_circle", {
    p_name: name,
    p_description: description || null,
    p_icon: icon || null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

/** Join a circle. Returns 'joined' | 'pending' | 'bad_code' | 'banned' | 'no'. */
export async function joinCircle(circleId: string, code?: string): Promise<string> {
  if (!supabase) return "no";
  const { data } = await supabase.rpc("join_circle", {
    p_circle: circleId,
    p_code: code ?? null,
  });
  return (data as string) ?? "no";
}

export async function approveCircleMember(
  circleId: string,
  userId: string,
  approve: boolean
): Promise<void> {
  await supabase?.rpc("approve_circle_member", {
    p_circle: circleId,
    p_user: userId,
    p_approve: approve,
  });
}

/** Owner: set visibility + join policy, optionally regenerating the code. Returns the code. */
export async function setCircleAccess(
  circleId: string,
  visibility: string | null,
  joinPolicy: string | null,
  regenCode: boolean
): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("set_circle_access", {
    p_circle: circleId,
    p_visibility: visibility,
    p_join_policy: joinPolicy,
    p_regen_code: regenCode,
  });
  return (data as string) ?? null;
}

/** Owner/mod: read the circle's join code (never exposed via table RLS). */
export async function getCircleCode(circleId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("get_circle_code", { p_circle: circleId });
  return (data as string) ?? null;
}

export async function setCircleDues(circleId: string, dues: number): Promise<void> {
  await supabase?.rpc("set_circle_dues", { p_circle: circleId, p_dues: dues });
}
export async function setCircleSupport(circleId: string, on: boolean): Promise<void> {
  await supabase?.rpc("set_circle_support", { p_circle: circleId, p_on: on });
}
/** Charge today's dues for a supporter on entry. Returns ok|free|insufficient|na. */
export async function payCircleDues(circleId: string): Promise<string> {
  if (!supabase) return "na";
  const { data } = await supabase.rpc("pay_circle_dues", { p_circle: circleId });
  return (data as string) ?? "na";
}
export async function setCircleTheme(circleId: string, theme: Record<string, string>): Promise<void> {
  await supabase?.rpc("set_circle_theme", { p_circle: circleId, p_theme: theme });
}
export async function setCircleSlug(circleId: string, slug: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("set_circle_slug", { p_circle: circleId, p_slug: slug });
  return data === true;
}

/** Lightweight typing indicator over a broadcast channel. */
export function circleTyping(
  circleId: string,
  me: { id: string; alias: string },
  onTyping: (who: { id: string; alias: string }) => void
): { notify: () => void; unsub: () => void } {
  if (!supabase) return { notify: () => {}, unsub: () => {} };
  const channel = supabase.channel(`circle-typing:${circleId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on("broadcast", { event: "typing" }, (m: { payload: { id: string; alias: string } }) =>
      onTyping(m.payload)
    )
    .subscribe();
  return {
    notify: () => {
      void channel.send({ type: "broadcast", event: "typing", payload: me });
    },
    unsub: () => {
      supabase?.removeChannel(channel);
    },
  };
}
export async function leaveCircle(circleId: string): Promise<void> {
  await supabase?.rpc("leave_circle", { p_circle: circleId });
}
export async function sendCircleMessage(opts: {
  circleId: string;
  body?: string;
  imageUrl?: string;
  nsfw?: boolean;
  alias: string;
  aura: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("send_circle_message", {
    p_circle: opts.circleId,
    p_body: opts.body ?? null,
    p_image: opts.imageUrl ?? null,
    p_nsfw: opts.nsfw ?? false,
    p_alias: opts.alias,
    p_aura: opts.aura,
  });
  return !error;
}
export async function renameCircle(circleId: string, name: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("rename_circle", { p_circle: circleId, p_name: name });
  return data === true;
}
export async function updateCircleSettings(opts: {
  circleId: string;
  description?: string;
  icon?: string;
  rules?: string;
  allowAnonymous?: boolean;
  nsfw?: boolean;
}): Promise<void> {
  await supabase?.rpc("update_circle_settings", {
    p_circle: opts.circleId,
    p_description: opts.description ?? null,
    p_icon: opts.icon ?? null,
    p_rules: opts.rules ?? null,
    p_allow_anonymous: opts.allowAnonymous ?? null,
    p_nsfw: opts.nsfw ?? null,
  });
}
export async function setCircleMember(
  circleId: string,
  userId: string,
  status: string | null,
  role: string | null
): Promise<void> {
  await supabase?.rpc("set_circle_member", {
    p_circle: circleId,
    p_user: userId,
    p_status: status,
    p_role: role,
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
