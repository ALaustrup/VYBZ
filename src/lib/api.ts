// ---------------------------------------------------------------------------
// VYBZ data access. Thin, typed wrappers over Supabase (auth, profiles, creator
// roles, matchmaking, drops, assets, ratings, connections, DMs). Identity-first:
// every call assumes a real, signed-in creator.
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase";
import type {
  Profile, ProfileDetails, Drop, Reaction, RoleOffer, RoleSeek,
  CollabMatch, Opportunity, AssetKind, DmThread, DmMessage,
  AppNotification, CreatorSearchResult, CreatorStats,
} from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const AUDIO_BUCKET = "audio-assets";
const AVATAR_BUCKET = "media-public";
const SIGN_TTL = 2 * 60 * 60;

function db() {
  if (!supabase) throw new Error("Supabase is not configured (missing env).");
  return supabase;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function signUp(email: string, password: string) {
  const { data, error } = await db().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
export async function signIn(email: string, password: string) {
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  await db().auth.signOut();
}
export async function currentUserId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

// ── Profiles ─────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function toProfile(r: any): Profile {
  return {
    id: r.id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    bio: r.bio ?? null,
    location: r.location ?? null,
    musicUrl: r.music_url ?? null,
    identityPublic: r.identity_public ?? true,
    isAdmin: r.is_admin ?? false,
    banned: r.banned ?? false,
    profile: (r.profile ?? {}) as ProfileDetails,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

export async function getMyProfile(id: string): Promise<Profile | null> {
  const { data, error } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toProfile(data);
}

export async function updateMyProfile(patch: {
  username?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  musicUrl?: string;
  avatarUrl?: string;
  identityPublic?: boolean;
  profile?: ProfileDetails;
}): Promise<{ error?: string }> {
  const row: Record<string, unknown> = {};
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.musicUrl !== undefined) row.music_url = patch.musicUrl;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.identityPublic !== undefined) row.identity_public = patch.identityPublic;
  if (patch.profile !== undefined) row.profile = patch.profile;
  const uid = await currentUserId();
  if (!uid) return { error: "Not signed in." };
  const { error } = await db().from("profiles").update(row).eq("id", uid);
  if (error) return { error: error.message };
  return {};
}

export async function usernameAvailable(username: string): Promise<boolean> {
  const { data } = await db()
    .from("public_profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);
  return !data || data.length === 0;
}

export interface PublicProfile {
  id: string; username: string | null; displayName: string | null;
  avatarUrl: string | null; bio: string | null; location: string | null;
  musicUrl: string | null; profile: ProfileDetails;
  offers: string[]; seeks: string[];
}
export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await db().rpc("public_profile", { p_id: id });
  if (error || !data || !data[0]) return null;
  const r = data[0];
  const roles = await rolesFor(id);
  return {
    id: r.id, username: r.username ?? null, displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null, bio: r.bio ?? null, location: r.location ?? null,
    musicUrl: r.music_url ?? null, profile: (r.profile ?? {}) as ProfileDetails,
    offers: roles.offers, seeks: roles.seeks,
  };
}

// ── Creator roles ──────────────────────────────────────────────────────────
export async function getMyRoles(): Promise<{ offers: RoleOffer[]; seeks: RoleSeek[] }> {
  const { data } = await db().rpc("my_creator_roles");
  const row = data?.[0];
  return {
    offers: (row?.offers ?? []).map((o: any) => ({ roleId: o.role_id, skill: o.skill })),
    seeks: (row?.seeks ?? []).map((s: any) => ({ roleId: s.role_id, priority: s.priority })),
  };
}
export async function setMyRoles(offers: RoleOffer[], seeks: RoleSeek[]) {
  const { error } = await db().rpc("set_creator_roles", {
    p_offers: offers.map((o) => ({ role_id: o.roleId, skill: o.skill })),
    p_seeks: seeks.map((s) => ({ role_id: s.roleId, priority: s.priority })),
  });
  if (error) throw error;
}
export async function rolesFor(id: string): Promise<{ offers: string[]; seeks: string[] }> {
  const { data } = await db().rpc("creator_roles_for", { p_id: id });
  const row = data?.[0];
  return { offers: row?.offers ?? [], seeks: row?.seeks ?? [] };
}

/**
 * Fire-and-forget: refresh the caller's semantic embedding (influences/genres/
 * bio → pgvector) so the resonance term in matchmaking reflects their sound.
 * The server function no-ops gracefully if the embedding provider is unavailable.
 */
export async function refreshEmbedding(): Promise<void> {
  try { await db().functions.invoke("embed", { body: {} }); } catch { /* non-fatal */ }
}

// ── Matchmaking ──────────────────────────────────────────────────────────────
export async function collabMatches(limit = 30): Promise<CollabMatch[]> {
  const { data, error } = await db().rpc("collab_matches", { p_limit: limit });
  if (error || !data) return [];
  return data.map((r: any) => ({
    userId: r.user_id, username: r.username ?? null,
    offersYouSeek: r.offers_you_seek ?? [], seeksYouOffer: r.seeks_you_offer ?? [],
    mutual: !!r.mutual, sharedGenres: r.shared_genres ?? [], sharedDaws: r.shared_daws ?? [],
    sharedPlugins: r.shared_plugins ?? [], openToWork: !!r.open_to_work,
    resonance: Number(r.resonance ?? 0), reputation: Number(r.reputation ?? 0), fit: Number(r.fit ?? 0),
  }));
}

export async function getCreatorStats(id: string): Promise<CreatorStats | null> {
  const { data } = await db().rpc("creator_profile_stats", { p_id: id });
  const r = data?.[0];
  if (!r) return null;
  return {
    avgRating: Number(r.avg_rating ?? 0), ratings: Number(r.ratings ?? 0),
    drops: Number(r.drops ?? 0), connections: Number(r.connections ?? 0),
    reputation: Number(r.reputation ?? 0),
  };
}

export async function myOpportunities(limit = 40): Promise<Opportunity[]> {
  const { data, error } = await db().rpc("my_opportunities", { p_limit: limit });
  if (error || !data) return [];
  return data.map(mapOpportunity);
}
function mapOpportunity(r: any): Opportunity {
  return {
    id: r.id, authorId: r.author_id, authorUsername: r.author_username ?? null,
    roleNeeded: r.role_needed, roleLabel: r.role_label, title: r.title, body: r.body ?? null,
    genres: r.genres ?? [], daws: r.daws ?? [], remoteOk: !!r.remote_ok,
    location: r.location ?? null, commitment: r.commitment ?? null,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    sharedGenres: r.shared_genres ?? [], sharedDaws: r.shared_daws ?? [],
    applied: !!r.applied, fit: Number(r.fit ?? 0),
  };
}
export async function listOpportunities(limit = 40): Promise<Opportunity[]> {
  // Everyone's open posts (browse), newest first, with author username.
  const { data } = await db()
    .from("collab_posts")
    .select("id,author_id,role_needed,title,body,genres,daws,remote_ok,location,commitment,created_at")
    .eq("status", "open").order("created_at", { ascending: false }).limit(limit);
  if (!data) return [];
  const authors = await usernamesFor(data.map((d: any) => d.author_id));
  const roleLabels = await roleLabelMap();
  return data.map((r: any) => ({
    id: r.id, authorId: r.author_id, authorUsername: authors.get(r.author_id) ?? null,
    roleNeeded: r.role_needed, roleLabel: roleLabels.get(r.role_needed) ?? r.role_needed,
    title: r.title, body: r.body ?? null, genres: r.genres ?? [], daws: r.daws ?? [],
    remoteOk: !!r.remote_ok, location: r.location ?? null, commitment: r.commitment ?? null,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    sharedGenres: [], sharedDaws: [], applied: false, fit: 0,
  }));
}
export async function createOpportunity(input: {
  roleNeeded: string; title: string; body?: string; genres?: string[];
  daws?: string[]; remoteOk?: boolean; location?: string; commitment?: string;
}) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_posts").insert({
    author_id: uid, role_needed: input.roleNeeded, title: input.title, body: input.body ?? null,
    genres: input.genres ?? [], daws: input.daws ?? [], remote_ok: input.remoteOk ?? true,
    location: input.location ?? null, commitment: input.commitment ?? null,
  });
  if (error) throw error;
}
export async function applyToOpportunity(postId: string, message?: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_applications").insert({
    post_id: postId, applicant_id: uid, message: message ?? null,
  });
  if (error) throw error;
}

let _roleLabelCache: Map<string, string> | null = null;
async function roleLabelMap(): Promise<Map<string, string>> {
  if (_roleLabelCache) return _roleLabelCache;
  const { data } = await db().from("roles").select("id,label");
  const m = new Map<string, string>();
  (data ?? []).forEach((r: any) => m.set(r.id, r.label));
  _roleLabelCache = m;
  return m;
}

async function usernamesFor(ids: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids));
  const m = new Map<string, string>();
  if (!uniq.length) return m;
  const { data } = await db().from("public_profiles").select("id,username").in("id", uniq);
  (data ?? []).forEach((r: any) => { if (r.username) m.set(r.id, r.username); });
  return m;
}

// ── Assets + upload ──────────────────────────────────────────────────────────
export async function uploadAudio(file: Blob, ext: string): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(AUDIO_BUCKET).upload(path, file, {
    contentType: file.type || "audio/mpeg", upsert: false,
  });
  return error ? null : path;
}
async function signAudio(paths: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const real = paths.filter((p) => p && !/^(https?:|data:|blob:)/i.test(p));
  if (!real.length) return m;
  const { data } = await db().storage.from(AUDIO_BUCKET).createSignedUrls(real, SIGN_TTL);
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) m.set(d.path, d.signedUrl); });
  return m;
}
export async function uploadAvatar(file: Blob, ext: string): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type || "image/webp", upsert: false,
  });
  if (error) return null;
  return db().storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── Drops (the sound-first feed) ─────────────────────────────────────────────
export interface NewDrop {
  title?: string; body?: string; seed: number; assetKind: AssetKind;
  audioUrl?: string; waveform?: number[]; durationSec?: number;
  bpm?: number; musicalKey?: string; audioFormat?: string; sampleRate?: number; lossless?: boolean;
}
export async function createDrop(input: NewDrop): Promise<Drop | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  let assetId: string | null = null;
  if (input.audioUrl) {
    const { data: asset, error: aerr } = await db().from("assets").insert({
      owner_id: uid, kind: input.assetKind, title: input.title || "Untitled",
      url: input.audioUrl, waveform: input.waveform ?? null, duration_sec: input.durationSec ?? null,
      bpm: input.bpm ?? null, musical_key: input.musicalKey ?? null, format: input.audioFormat ?? null,
      sample_rate: input.sampleRate ?? null, lossless: input.lossless ?? false,
    }).select("id").single();
    if (aerr || !asset) return null;
    assetId = (asset as any).id;
  }
  const { data: drop, error } = await db().from("drops").insert({
    author_id: uid, title: input.title ?? null, body: input.body ?? null,
    asset_id: assetId, seed: input.seed,
  }).select("id,created_at").single();
  if (error || !drop) return null;
  const signed = input.audioUrl ? (await signAudio([input.audioUrl])).get(input.audioUrl) : undefined;
  return {
    id: (drop as any).id, authorId: uid, authorUsername: null, title: input.title ?? null,
    body: input.body ?? null, seed: input.seed, feels: 0, wilds: 0,
    createdAt: new Date((drop as any).created_at).getTime(), assetId,
    audioUrl: signed ?? input.audioUrl, waveform: input.waveform, durationSec: input.durationSec,
    assetKind: input.assetKind, bpm: input.bpm ?? null, musicalKey: input.musicalKey ?? null,
    audioFormat: input.audioFormat ?? null, sampleRate: input.sampleRate ?? null, lossless: input.lossless,
  };
}

async function assembleDrops(rows: any[], myId: string | null): Promise<Drop[]> {
  if (!rows.length) return [];
  const authors = await usernamesFor(rows.map((r) => r.author_id));
  const assetIds = rows.map((r) => r.asset_id).filter(Boolean);
  const assetMap = new Map<string, any>();
  if (assetIds.length) {
    const { data } = await db().from("assets")
      .select("id,kind,url,waveform,duration_sec,bpm,musical_key,format,sample_rate,lossless,rating_avg,rating_count")
      .in("id", assetIds);
    (data ?? []).forEach((a: any) => assetMap.set(a.id, a));
  }
  const signed = await signAudio(Array.from(assetMap.values()).map((a) => a.url).filter(Boolean));
  // My reactions + ratings.
  const myReactions = new Map<string, Reaction>();
  const myRatings = new Map<string, number>();
  if (myId) {
    const { data: rx } = await db().from("reactions").select("drop_id,reaction")
      .eq("user_id", myId).in("drop_id", rows.map((r) => r.id));
    (rx ?? []).forEach((r: any) => myReactions.set(r.drop_id, r.reaction));
    if (assetIds.length) {
      const { data: rt } = await db().from("track_ratings").select("asset_id,rating")
        .eq("user_id", myId).in("asset_id", assetIds);
      (rt ?? []).forEach((r: any) => myRatings.set(r.asset_id, r.rating));
    }
  }
  return rows.map((r) => {
    const a = r.asset_id ? assetMap.get(r.asset_id) : null;
    return {
      id: r.id, authorId: r.author_id, authorUsername: authors.get(r.author_id) ?? null,
      title: r.title ?? null, body: r.body ?? null, seed: r.seed ?? 0,
      feels: r.feels ?? 0, wilds: r.wilds ?? 0,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      assetId: r.asset_id ?? null,
      audioUrl: a ? (signed.get(a.url) ?? a.url) : undefined,
      waveform: a?.waveform ?? undefined, durationSec: a?.duration_sec ?? undefined,
      assetKind: a?.kind ?? undefined, bpm: a?.bpm ?? null, musicalKey: a?.musical_key ?? null,
      audioFormat: a?.format ?? null, sampleRate: a?.sample_rate ?? null, lossless: a?.lossless ?? false,
      rating: a ? Number(a.rating_avg ?? 0) : undefined,
      ratingCount: a ? Number(a.rating_count ?? 0) : undefined,
      myReaction: myReactions.get(r.id), myRating: r.asset_id ? myRatings.get(r.asset_id) : undefined,
    } as Drop & { myReaction?: Reaction; myRating?: number };
  });
}

export async function listDrops(limit = 40): Promise<(Drop & { myReaction?: Reaction; myRating?: number })[]> {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id")
    .order("created_at", { ascending: false }).limit(limit);
  return assembleDrops(data ?? [], myId);
}
export async function dropsBy(authorId: string, limit = 40) {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id")
    .eq("author_id", authorId).order("created_at", { ascending: false }).limit(limit);
  return assembleDrops(data ?? [], myId);
}

export async function react(dropId: string, reaction: Reaction) {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("reactions").upsert({ drop_id: dropId, user_id: uid, reaction });
}
export async function rateTrack(dropId: string, stars: number) {
  await db().rpc("rate_track", { p_drop: dropId, p_rating: stars });
}

// ── Connections + DMs ────────────────────────────────────────────────────────
export async function connect(peerId: string) {
  const uid = await currentUserId();
  if (!uid || uid === peerId) return;
  await db().from("connections").upsert({ requester_id: uid, addressee_id: peerId, status: "pending" });
}
export async function startDm(peerId: string): Promise<string | null> {
  const { data, error } = await db().rpc("start_dm", { p_peer: peerId });
  if (error) return null;
  return (data as string) ?? null;
}
export async function listThreads(): Promise<DmThread[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await db().from("dm_threads")
    .select("id,user_a,user_b,last_at").order("last_at", { ascending: false });
  if (!data) return [];
  const peers = data.map((t: any) => (t.user_a === uid ? t.user_b : t.user_a));
  const names = await usernamesFor(peers);
  return data.map((t: any) => {
    const peerId = t.user_a === uid ? t.user_b : t.user_a;
    return { id: t.id, peerId, peerUsername: names.get(peerId) ?? null, lastAt: new Date(t.last_at).getTime() };
  });
}
export async function listMessages(threadId: string): Promise<DmMessage[]> {
  const uid = await currentUserId();
  const { data } = await db().from("dm_messages")
    .select("id,thread_id,sender_id,body,created_at").eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m: any) => ({
    id: m.id, threadId: m.thread_id, senderId: m.sender_id, body: m.body,
    createdAt: new Date(m.created_at).getTime(), mine: m.sender_id === uid,
  }));
}
export async function sendMessage(threadId: string, body: string) {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("dm_messages").insert({ thread_id: threadId, sender_id: uid, body });
  await db().from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", threadId);
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await db().from("notifications")
    .select("id,kind,actor_id,title,body,ref_id,read,created_at")
    .order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((n: any) => ({
    id: n.id, kind: n.kind, actorId: n.actor_id ?? null, title: n.title,
    body: n.body ?? null, refId: n.ref_id ?? null, read: !!n.read,
    createdAt: new Date(n.created_at).getTime(),
  }));
}
export async function unreadNotificationCount(): Promise<number> {
  const { count } = await db().from("notifications")
    .select("id", { count: "exact", head: true }).eq("read", false);
  return count ?? 0;
}
export async function markNotificationsRead() {
  await db().rpc("mark_notifications_read");
}

// ── Search / discovery ────────────────────────────────────────────────────────
export async function searchCreators(query?: string, role?: string, genre?: string): Promise<CreatorSearchResult[]> {
  const { data } = await db().rpc("search_creators", {
    p_query: query || null, p_role: role || null, p_genre: genre || null, p_limit: 40,
  });
  return (data ?? []).map((r: any) => ({
    userId: r.user_id, username: r.username ?? null, location: r.location ?? null,
    offers: r.offers ?? [], seeks: r.seeks ?? [], genres: r.genres ?? [],
  }));
}

// ── Realtime ──────────────────────────────────────────────────────────────────
/** Subscribe to inserts on a table (optionally filtered). Returns the channel. */
export function subscribeInserts(table: string, filter: string | undefined, cb: () => void): RealtimeChannel {
  const ch = db().channel(`rt-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`);
  ch.on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, () => cb()).subscribe();
  return ch;
}
export function unsubscribe(ch: RealtimeChannel | null) {
  if (ch && supabase) supabase.removeChannel(ch);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
