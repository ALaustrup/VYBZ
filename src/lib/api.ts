// ---------------------------------------------------------------------------
// VYBZ data access. Thin, typed wrappers over Supabase (auth, profiles, creator
// roles, matchmaking, drops, assets, ratings, connections, DMs). Identity-first:
// every call assumes a real, signed-in creator.
// ---------------------------------------------------------------------------

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { FLAGS } from "@/lib/flags";
import type {
  Profile, ProfileDetails, Drop, Reaction, RoleOffer, RoleSeek,
  CollabMatch, Opportunity, AssetKind, DmThread, DmMessage,
  AppNotification, CreatorSearchResult, CreatorStats,
  DisciplineModule, DisciplineCategory, DisciplineSchema, ModuleInput,
  DisciplineOption, SeekingIntent, PortfolioItem,
  AdminMember, PendingDiscipline, BugReport, BugStatus, MatchWeights, MatchLearningReport,
  ProfileProject, ProfileProjectDetail, ProjectInput, PostInput, LinkInput, FeedPost,
  PlatformRole, ReportKind, ReportReason, ModAction, ContentReport, StaffMember,
  StaffAction, ModStats, ModApplicationRow, MyModApplication,
  Cosmetic, CosmeticStore, CosmeticPackage, AdminCosmeticStats, AdminMatchFairness,
  LiveSessionCard, LiveSessionDetail, LiveMessage, LiveSource,
  PostFx, PostAudience, PlaybackCustomization, ArtistProfile, ReleaseType,
  SocialScore,
} from "@/types";
import { canStartLive } from "@/features/airtime/atcApi";
import { openProvenanceForLive, sealProvenanceForLive } from "@/features/provenance/provenanceApi";
import {
  audioModeForSource,
  isCheckViolation,
  legacyDawFallback,
  persistableLiveSource,
  resolveLiveSource,
  sourceIngestPatch,
} from "@/features/broadcast/liveSource";
import { buildPlaybackCustomization, parsePlaybackCustomization } from "@/lib/playbackCustomization";
import { analyzeRepoPack, type RepoDawHint } from "@/lib/repoSync";
import { parseVcAddress } from "@/lib/vc";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  PackCopyResult,
  StorefrontOrder,
  StorefrontPack,
  StorefrontPackPublic,
} from "@/features/storefront/types";
import {
  STOREFRONT_PREVIEWS_BUCKET,
  STOREFRONT_ZIPS_BUCKET,
} from "@/features/storefront/types";
import { uniqueSlug } from "@/features/storefront/slug";

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

/** Signed-in user chooses their own password. Does not lock the wipe gate. */
export async function setAccountPassword(password: string): Promise<{ error?: string }> {
  const { error } = await db().auth.updateUser({ password });
  if (error) return { error: error.message };
  return {};
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
  // `pro_until` is a real column and the only authority on entitlement. Drop any
  // stale copy inside the jsonb so a cached write can never grant Pro.
  const details = { ...((r.profile ?? {}) as ProfileDetails) };
  delete details.proUntil;
  if (r.pro_until) details.proUntil = r.pro_until;

  return {
    id: r.id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    bio: r.bio ?? null,
    location: r.location ?? null,
    lat: typeof r.lat === "number" ? r.lat : r.lat != null ? Number(r.lat) : null,
    lng: typeof r.lng === "number" ? r.lng : r.lng != null ? Number(r.lng) : null,
    musicUrl: r.music_url ?? null,
    identityPublic: r.identity_public ?? true,
    isAdmin: r.is_admin ?? false,
    platformRole: (r.platform_role ?? (r.is_admin ? "admin" : "member")) as Profile["platformRole"],
    modPoints: Number(r.mod_points ?? 0),
    equippedCosmetics: (r.equipped_cosmetics ?? {}) as Record<string, string>,
    banned: r.banned ?? false,
    alphaAccessAt: r.alpha_access_at ?? null,
    passwordLockedAt: r.password_locked_at ?? null,
    profile: details,
    featuredDropId: r.featured_drop_id ?? null,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

export type RedeemInviteResult =
  | { ok: true; already: boolean; batchId?: string }
  | { ok: false; reason: string };

export type LockPasswordResult =
  | { ok: true; already: boolean; lockedAt?: string }
  | { ok: false; reason: string };

/**
 * Set Auth password for the signed-in user, then mark profiles.password_locked_at.
 * Password is sent only to Supabase Auth — never stored in app tables.
 */
export async function lockAccountPassword(password: string): Promise<LockPasswordResult> {
  const { error: authErr } = await db().auth.updateUser({ password });
  if (authErr) return { ok: false, reason: authErr.message };
  const { data, error } = await db().rpc("lock_account_password");
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as LockPasswordResult;
}

/** Redeem an alpha invite key (OR-023). Server sets profiles.alpha_access_at. */
export async function redeemInviteKey(code: string): Promise<RedeemInviteResult> {
  const { data, error } = await db().rpc("redeem_invite_key", { p_code: code });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as RedeemInviteResult;
}

export type MintInviteCode = {
  id: string;
  code: string;
  batchId: string;
  expiresAt: string;
  maxRedemptions: number;
};

export type MintInviteResult =
  | { ok: true; count: number; batchId: string; expiresAt: string; codes: MintInviteCode[] }
  | { ok: false; reason: string };

/** Admin-only: mint invite keys. Plaintext codes returned once. */
export async function mintInviteKeys(input: {
  count?: number;
  batch?: string;
  note?: string;
  expiresDays?: number;
  maxRedemptions?: number;
}): Promise<MintInviteResult> {
  const { data, error } = await db().rpc("mint_invite_keys", {
    p_count: input.count ?? 1,
    p_batch: input.batch ?? "A1",
    p_note: input.note ?? null,
    p_expires_days: input.expiresDays ?? 30,
    p_max_redemptions: input.maxRedemptions ?? 1,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as MintInviteResult;
}

export type InviteKeyRow = {
  id: string;
  codePrefix: string;
  batchId: string;
  note: string | null;
  maxRedemptions: number;
  redeemedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

export async function adminListInviteKeys(limit = 100): Promise<InviteKeyRow[]> {
  const { data, error } = await db().rpc("admin_list_invite_keys", { p_limit: limit });
  if (error) return [];
  return (data ?? []) as InviteKeyRow[];
}

export async function adminRevokeInviteKeys(input: {
  batch?: string;
  keyId?: string;
}): Promise<{ ok: boolean; revoked?: number; reason?: string }> {
  const { data, error } = await db().rpc("admin_revoke_invite_keys", {
    p_batch: input.batch ?? null,
    p_key_id: input.keyId ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as { ok: boolean; revoked?: number; reason?: string };
}

export async function adminGrantAlphaAccess(userId: string, note?: string): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await db().rpc("admin_grant_alpha_access", {
    p_user: userId,
    p_note: note ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as { ok: boolean; reason?: string };
}

export type ProPurchaseResult =
  | { ok: true; already: boolean; proUntil: string; charged: number; overageGb?: number; balance: number }
  | { ok: false; reason: string; required?: number; balance?: number; shortfall?: number };

/** Charge Vc for one Pro hosting period. The server is the only authority. */
export async function purchasePro(storageGb = 0): Promise<ProPurchaseResult> {
  const { data, error } = await db().rpc("purchase_pro", { p_storage_gb: storageGb });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "no_response" }) as ProPurchaseResult;
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
  lat?: number | null;
  lng?: number | null;
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
  if (patch.lat !== undefined) row.lat = patch.lat;
  if (patch.lng !== undefined) row.lng = patch.lng;
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

export async function mySocialScore(): Promise<SocialScore | null> {
  const { data, error } = await db().rpc("my_social_score");
  if (error || !data?.[0]) return null;
  const r = data[0];
  return {
    userId: r.user_id,
    dimensions: (r.dimensions ?? {}) as Record<string, unknown>,
    confidence: Number(r.confidence ?? 0),
    matchable: !!r.matchable,
    whyHints: (r.why_hints ?? []) as string[],
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
  };
}

export async function recordSocialScoreEvent(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db().rpc("record_social_score_event", { p_kind: kind, p_payload: payload });
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
  equippedCosmetics: Record<string, string>;
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
    equippedCosmetics: (r.equipped_cosmetics ?? {}) as Record<string, string>,
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

/**
 * Close the onboarding → matchmaking loop: persist role/intents, upsert a
 * profile_module, and seed complementary seeks from role_affinities.
 */
export async function applyRoleIntentOnboarding(
  roleId: string | null,
  roleLabel: string,
  intents: string[],
  seekRoles: string[] = [],
  profession: string | null = null,
  secondaries: string[] = [],
  roleClass: string = "creator",
): Promise<string | null> {
  const { data, error } = await db().rpc("apply_role_intent_onboarding", {
    p_role_id: roleId,
    p_role_label: roleLabel,
    p_intents: intents,
    p_seek_roles: seekRoles,
    p_profession: profession,
    p_secondaries: secondaries,
    p_role_class: roleClass,
  });
  if (error) throw error;
  return (data as string) ?? null;
}

/** Change the caller's Role Class later (Phase O1). Returns the applied class. */
export async function setRoleClass(roleClass: string): Promise<string> {
  const { data, error } = await db().rpc("set_role_class", { p_class: roleClass });
  if (error) throw error;
  return (data as string) ?? "creator";
}
export async function rolesFor(id: string): Promise<{ offers: string[]; seeks: string[] }> {
  const { data } = await db().rpc("creator_roles_for", { p_id: id });
  const row = data?.[0];
  return { offers: row?.offers ?? [], seeks: row?.seeks ?? [] };
}

// ── Discipline modules (tabbed, multi-discipline profiles) ──────────────────
function mapModule(m: any): DisciplineModule {
  return {
    id: m.id, roleId: m.roleId, category: m.category ?? null, label: m.label,
    headline: m.headline ?? null, yearsExp: m.yearsExp ?? null,
    collabStyle: m.collabStyle ?? null, availability: m.availability ?? null,
    seeking: (m.seeking ?? []) as SeekingIntent[], skill: m.skill ?? null,
    attrs: (m.attrs ?? {}) as Record<string, unknown>,
    portfolio: (m.portfolio ?? []) as PortfolioItem[],
    sort: m.sort ?? 0,
  };
}

/** The signed-in creator's active discipline modules (ordered). */
export async function myModules(): Promise<DisciplineModule[]> {
  const { data, error } = await db().rpc("my_modules");
  if (error || !data) return [];
  return (data as any[]).map(mapModule);
}

/** The full discipline catalog (categories → disciplines) for the picker. */
export async function listDisciplines(): Promise<DisciplineCategory[]> {
  const { data, error } = await db().rpc("list_disciplines");
  if (error || !data) return [];
  return (data as any[]).map((c) => ({
    id: c.id, label: c.label, icon: c.icon ?? null, sort: c.sort ?? 0,
    disciplines: (c.disciplines ?? []).map((d: any) => ({
      id: d.id, label: d.label, family: d.family, hasSchema: !!d.hasSchema,
    })),
  }));
}

/** The discipline-specific field schema for a role (or null if none). */
export async function disciplineSchema(roleId: string): Promise<DisciplineSchema | null> {
  const { data, error } = await db().rpc("discipline_schema", { p_role: roleId });
  if (error || !data) return null;
  return data as DisciplineSchema;
}

/** Create or update a module; returns its id. Also syncs the matchmaking graph. */
export async function upsertModule(input: ModuleInput): Promise<string> {
  const { data, error } = await db().rpc("upsert_module", {
    p: {
      id: input.id,
      roleId: input.roleId,
      headline: input.headline ?? null,
      yearsExp: input.yearsExp ?? null,
      collabStyle: input.collabStyle ?? null,
      availability: input.availability ?? null,
      seeking: input.seeking ?? [],
      skill: input.skill ?? null,
      attrs: input.attrs ?? {},
      portfolio: input.portfolio ?? [],
    },
  });
  if (error) throw error;
  return data as string;
}

export async function archiveModule(id: string): Promise<void> {
  const { error } = await db().rpc("archive_module", { p_id: id });
  if (error) throw error;
}

export async function restoreModule(id: string): Promise<void> {
  const { error } = await db().rpc("restore_module", { p_id: id });
  if (error) throw error;
}

export async function reorderModules(ids: string[]): Promise<void> {
  const { error } = await db().rpc("reorder_modules", { p_ids: ids });
  if (error) throw error;
}

// ── Projects (in-profile creative spaces) ───────────────────────────────────
export async function listProfileProjects(userId: string): Promise<ProfileProject[]> {
  const { data, error } = await db().rpc("list_profile_projects", { p_uid: userId });
  if (error || !data) return [];
  return data as ProfileProject[];
}

export async function getProjectDetail(id: string): Promise<ProfileProjectDetail | null> {
  const { data, error } = await db().rpc("profile_project_detail", { p_id: id });
  if (error || !data) return null;
  const d = data as any;
  return {
    ...d,
    posts: (d.posts ?? []).map((p: any) => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now() })),
    widgets: (d.widgets ?? []).map((w: any) => ({ id: w.id, kind: w.kind, title: w.title ?? null, config: w.config ?? {}, sort: w.sort ?? 0 })),
  } as ProfileProjectDetail;
}

// ── Project widgets — owner-scoped via RLS on project_page_widgets ───
export async function addSpaceWidget(projectId: string, kind: string, config: Record<string, unknown>, title?: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await db().from("project_page_widgets").insert({
    project_id: projectId, user_id: uid, kind, title: title ?? null, config,
    sort: Math.floor(Date.now() / 1000),
  });
  return !error;
}
export async function removeSpaceWidget(id: string): Promise<boolean> {
  const { error } = await db().from("project_page_widgets").delete().eq("id", id);
  return !error;
}

export async function createProfileProject(input: ProjectInput): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await db().from("profile_projects").insert({
    user_id: uid, name: input.name, kind: input.kind,
    tagline: input.tagline ?? null, accent: input.accent ?? null, cover_url: input.coverUrl ?? null,
    sort: Math.floor(Date.now() / 1000),
  }).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.tagline !== undefined) row.tagline = patch.tagline;
  if (patch.accent !== undefined) row.accent = patch.accent;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.kind !== undefined) row.kind = patch.kind;
  const { error } = await db().from("profile_projects").update(row).eq("id", id);
  if (error) throw error;
}

export async function archiveProject(id: string): Promise<void> {
  const { error } = await db().from("profile_projects").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function reorderProjects(ids: string[]): Promise<void> {
  const { error } = await db().rpc("reorder_profile_projects", { p_ids: ids });
  if (error) throw error;
}

export async function createPost(input: PostInput): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const audience = input.audience ?? "public";
  const { data, error } = await db().from("project_posts").insert({
    project_id: input.projectId, user_id: uid, kind: input.kind,
    title: input.title ?? null, body: input.body ?? null,
    media_url: input.mediaUrl ?? null, link_url: input.linkUrl ?? null,
    audience, scheduled_at: input.scheduledAt ?? null,
    fx: input.fx ?? "glow",
  }).select("id").single();
  if (error) throw error;
  const postId = (data as { id: string }).id;
  if (audience === "private" && input.inviteeIds?.length) {
    const rows = input.inviteeIds.filter((id) => id && id !== uid).map((invitee_id) => ({
      post_id: postId, invitee_id,
    }));
    if (rows.length) await db().from("post_invites").upsert(rows);
  }
  return postId;
}

/**
 * Upload post media to Bunny.net (via the bunny-upload Edge Function, so the
 * write key stays server-side). Returns the Bunny CDN URL — CORS + range enabled,
 * so audio/video playback + the reactive analyser work. Reports real progress.
 */
export async function uploadPostMedia(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) throw new Error("Not signed in");
  const endpoint = `${SUPABASE_URL}/functions/v1/bunny-upload?name=${encodeURIComponent(file.name)}`;
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${sess.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).url as string); } catch { reject(new Error("Bad upload response")); }
      } else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await db().from("project_posts").delete().eq("id", id);
  if (error) throw error;
}

/** Soft boolean delete for Library UI (RLS enforces ownership). */
export async function deleteMyPost(id: string): Promise<boolean> {
  try {
    await deletePost(id);
    return true;
  } catch {
    return false;
  }
}

/** Rename one of your own project posts (RLS enforces ownership). */
export async function updatePostTitle(id: string, title: string): Promise<boolean> {
  const { error } = await db().from("project_posts").update({ title: title.trim() || null }).eq("id", id);
  return !error;
}

/**
 * All project posts authored by the signed-in user (Library — Posts tab).
 * Joins project meta for navigation / accent; likes left at 0 (manage, not social).
 */
export async function myProjectPosts(limit = 80): Promise<FeedPost[]> {
  const me = await currentUserId();
  if (!me) return [];
  const { data, error } = await db()
    .from("project_posts")
    .select("id,kind,title,body,media_url,link_url,created_at,fx,project_id,user_id, projects(id,name,kind,accent)")
    .eq("user_id", me)
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const username = (await usernamesFor([me])).get(me) ?? null;
  return (data as any[]).map((r) => {
    const proj = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    return {
      id: r.id,
      kind: r.kind,
      title: r.title ?? null,
      body: r.body ?? null,
      mediaUrl: r.media_url ?? null,
      linkUrl: r.link_url ?? null,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      fx: r.fx ?? null,
      projectId: r.project_id,
      projectName: proj?.name ?? "Project",
      projectKind: proj?.kind ?? "general",
      accent: proj?.accent ?? null,
      authorId: r.user_id,
      authorUsername: username,
      likes: 0,
      liked: false,
    } as FeedPost;
  });
}

export async function addProjectLink(input: LinkInput): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await db().from("project_links").insert({
    project_id: input.projectId, user_id: uid, label: input.label,
    url: input.url ?? null, thumb_url: input.thumbUrl ?? null,
    target_project_id: input.targetProjectId ?? null, sort: Math.floor(Date.now() / 1000),
  }).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteProjectLink(id: string): Promise<void> {
  const { error } = await db().from("project_links").delete().eq("id", id);
  if (error) throw error;
}

export async function followProject(id: string, on: boolean): Promise<void> {
  const { error } = await db().rpc("follow_project", { p_id: id, p_on: on });
  if (error) throw error;
}

export async function likePost(id: string, on: boolean): Promise<void> {
  const { error } = await db().rpc("like_post", { p_id: id, p_on: on });
  if (error) throw error;
}

/** Unified project-post feed. scope: all | following | music | art | video | writing. */
export async function feedPosts(scope = "all", limit = 40): Promise<FeedPost[]> {
  const { data, error } = await db().rpc("feed_posts", { p_scope: scope, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((p) => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now() })) as FeedPost[];
}
function mapPosts(data: any): FeedPost[] {
  if (!data) return [];
  return (data as any[]).map((p) => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now() })) as FeedPost[];
}
/** Personalized "For you" feed: complement-fit + Space-follows + intent, recency-decayed. */
export async function feedForYou(limit = 40): Promise<FeedPost[]> {
  const { data, error } = await db().rpc("feed_for_you", { p_limit: limit });
  if (error) return [];
  return mapPosts(data);
}
/** Anti-popularity "Undiscovered": fresh, least-liked posts first. */
export async function feedUndiscovered(limit = 40): Promise<FeedPost[]> {
  const { data, error } = await db().rpc("feed_undiscovered", { p_limit: limit });
  if (error) return [];
  return mapPosts(data);
}

// ── Admin console ────────────────────────────────────────────────────────────
export async function adminListMembers(q = "", limit = 50): Promise<AdminMember[]> {
  const { data, error } = await db().rpc("admin_list_members", { p_q: q, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((m) => ({
    userId: m.userId, username: m.username ?? null, location: m.location ?? null,
    isAdmin: !!m.isAdmin, role: (m.role ?? (m.isAdmin ? "admin" : "member")) as AdminMember["role"],
    points: Number(m.points ?? 0), banned: !!m.banned, createdAt: m.createdAt,
    modules: Number(m.modules ?? 0), drops: Number(m.drops ?? 0),
  }));
}
export async function adminSetBanned(userId: string, banned: boolean): Promise<void> {
  const { error } = await db().rpc("admin_set_banned", { p_user: userId, p_banned: banned });
  if (error) throw error;
}
export async function adminSetAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const { error } = await db().rpc("admin_set_admin", { p_user: userId, p_is_admin: isAdmin });
  if (error) throw error;
}
export async function adminPendingDisciplines(): Promise<PendingDiscipline[]> {
  const { data, error } = await db().rpc("admin_pending_disciplines");
  if (error || !data) return [];
  return (data as any[]).map((d) => ({
    id: d.id, rawLabel: d.rawLabel, status: d.status,
    requestedBy: d.requestedBy ?? null, userId: d.userId, createdAt: d.createdAt,
  }));
}
export async function adminPromoteDiscipline(requestId: string, opts: { category?: string | null; roleId?: string | null; label?: string | null } = {}): Promise<string> {
  const { data, error } = await db().rpc("admin_promote_discipline", {
    p_request: requestId, p_category: opts.category ?? null, p_role: opts.roleId ?? null, p_label: opts.label ?? null,
  });
  if (error) throw error;
  return (data as any)?.roleId ?? "";
}
export async function adminRejectDiscipline(requestId: string): Promise<void> {
  const { error } = await db().rpc("admin_reject_discipline", { p_request: requestId });
  if (error) throw error;
}
export async function getMatchmakingConfig(): Promise<MatchWeights> {
  const { data, error } = await db().rpc("get_matchmaking_config");
  if (error || !data) return {};
  return data as MatchWeights;
}
export async function setMatchmakingConfig(config: MatchWeights): Promise<void> {
  const { error } = await db().rpc("set_matchmaking_config", { p: config });
  if (error) throw error;
}

// ── Learning-to-rank (outcome-driven weight tuning, §5.4h) ───────────────────
function mapLearningReport(data: any): MatchLearningReport {
  const report = (data?.report ?? {}) as Record<string, any>;
  const signals = Object.entries(report).map(([key, v]: [string, any]) => ({
    key,
    base: Number(v?.base ?? 0),
    learned: Number(v?.learned ?? 0),
    multiplier: Number(v?.multiplier ?? 1),
    pos: Number(v?.pos ?? 0),
    neg: Number(v?.neg ?? 0),
    support: Number(v?.support ?? 0),
  })).sort((a, b) => b.multiplier - a.multiplier);
  return {
    signals,
    runs: Number(data?.runs ?? 0),
    feedbackCount: Number(data?.feedbackCount ?? 0),
    updatedAt: data?.updatedAt ?? null,
  };
}
/** Read the latest learned-weight report (admin only; empty until first run). */
export async function getMatchLearning(): Promise<MatchLearningReport> {
  const { data, error } = await db().rpc("match_learning_report");
  if (error || !data) return { signals: [], runs: 0, feedbackCount: 0, updatedAt: null };
  return mapLearningReport(data);
}
/** Run the learner now (admin only): tunes weights from recent match outcomes. */
export async function runMatchLearning(): Promise<MatchLearningReport> {
  const { data, error } = await db().rpc("run_match_learning");
  if (error) throw error;
  // run_match_learning returns { feedback_count, report, learned }; normalize.
  const normalized = {
    report: (data as any)?.report ?? {},
    feedbackCount: (data as any)?.feedback_count ?? 0,
    runs: 0,
    updatedAt: new Date().toISOString(),
  };
  return mapLearningReport(normalized);
}
export async function adminListBugReports(status: string | null = null): Promise<BugReport[]> {
  const { data, error } = await db().rpc("admin_list_bug_reports", { p_status: status });
  if (error || !data) return [];
  return (data as any[]).map((b) => ({
    id: b.id, title: b.title, body: b.body ?? null, context: b.context ?? {},
    status: b.status, reportedBy: b.reportedBy ?? null, userId: b.userId ?? null, createdAt: b.createdAt,
  }));
}
export async function adminSetBugStatus(id: string, status: BugStatus): Promise<void> {
  const { error } = await db().rpc("admin_set_bug_status", { p_id: id, p_status: status });
  if (error) throw error;
}
export async function submitBugReport(title: string, body: string, context: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await db().rpc("submit_bug_report", { p_title: title, p_body: body, p_context: context });
  if (error) throw error;
  return data as string;
}

// ── Staff: roles, moderation queue, rewards, applications ────────────────────
export async function reportContent(kind: ReportKind, targetId: string, reason: ReportReason, detail?: string): Promise<void> {
  const { error } = await db().rpc("report_content", { p_kind: kind, p_id: targetId, p_reason: reason, p_detail: detail ?? null });
  if (error) throw error;
}
export async function modReportQueue(status: string | null = "open"): Promise<ContentReport[]> {
  const { data, error } = await db().rpc("mod_report_queue", { p_status: status });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id, targetKind: r.targetKind, targetId: r.targetId, reason: r.reason, detail: r.detail ?? null,
    status: r.status, escalated: !!r.escalated, reporter: r.reporter ?? null, authorUsername: r.authorUsername ?? null,
    snippet: r.snippet ?? null, reportCount: Number(r.reportCount ?? 1), handledBy: r.handledBy ?? null, createdAt: r.createdAt,
  }));
}
export async function modResolveReport(id: string, action: ModAction, note?: string): Promise<{ status: string; points: number }> {
  const { data, error } = await db().rpc("mod_resolve_report", { p_id: id, p_action: action, p_note: note ?? null });
  if (error) throw error;
  return data as { status: string; points: number };
}
export async function modStats(): Promise<ModStats | null> {
  const { data, error } = await db().rpc("mod_stats");
  if (error || !data) return null;
  return data as ModStats;
}
export async function submitModApplication(input: { pitch: string; experience?: string; hours?: number; timezone?: string }): Promise<string> {
  const { data, error } = await db().rpc("submit_mod_application", {
    p_pitch: input.pitch, p_experience: input.experience ?? null, p_hours: input.hours ?? null, p_timezone: input.timezone ?? null,
  });
  if (error) throw error;
  return data as string;
}
export async function myModApplication(): Promise<MyModApplication | null> {
  const { data, error } = await db().rpc("my_mod_application");
  if (error || !data) return null;
  return data as MyModApplication;
}
export async function adminListModApplications(status: string | null = "pending"): Promise<ModApplicationRow[]> {
  const { data, error } = await db().rpc("admin_list_mod_applications", { p_status: status });
  if (error || !data) return [];
  return (data as any[]).map((a) => ({
    id: a.id, userId: a.userId, username: a.username ?? null, pitch: a.pitch, experience: a.experience ?? null,
    hoursPerWeek: a.hoursPerWeek ?? null, timezone: a.timezone ?? null, status: a.status, createdAt: a.createdAt,
  }));
}
export async function adminReviewModApplication(id: string, approve: boolean, note?: string): Promise<void> {
  const { error } = await db().rpc("admin_review_mod_application", { p_id: id, p_approve: approve, p_note: note ?? null });
  if (error) throw error;
}
export async function adminSetRole(userId: string, role: PlatformRole): Promise<void> {
  const { error } = await db().rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) throw error;
}
export async function adminListStaff(): Promise<StaffMember[]> {
  const { data, error } = await db().rpc("admin_list_staff");
  if (error || !data) return [];
  return (data as any[]).map((s) => ({
    userId: s.userId, username: s.username ?? null, role: s.role, points: Number(s.points ?? 0), resolved: Number(s.resolved ?? 0),
  }));
}
export async function staffAudit(limit = 60): Promise<StaffAction[]> {
  const { data, error } = await db().rpc("staff_audit", { p_limit: limit });
  if (error || !data) return [];
  return data as StaffAction[];
}

// ── Cosmetics (Lane B store) ─────────────────────────────────────────────────
let _cosmeticCatalog: Cosmetic[] | null = null;
function mapCosmeticStore(raw: any): CosmeticStore {
  const packages: CosmeticPackage[] = ((raw?.packages ?? []) as any[]).map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? "",
    price: Number(p.price ?? 0),
    itemIds: (p.itemIds ?? p.item_ids ?? []) as string[],
    featured: !!p.featured,
  }));
  return {
    credits: Number(raw?.credits ?? 0),
    equipped: (raw?.equipped ?? {}) as Record<string, string>,
    owned: (raw?.owned ?? []) as string[],
    catalog: (raw?.catalog ?? []) as Cosmetic[],
    packages,
  };
}

export async function listCosmetics(): Promise<CosmeticStore> {
  const { data, error } = await db().rpc("list_cosmetics");
  const store = mapCosmeticStore(error || !data ? null : data);
  _cosmeticCatalog = store.catalog;
  return store;
}
/** Cached catalog for resolving equipped cosmetic ids → data on any profile. */
export async function cosmeticCatalog(): Promise<Cosmetic[]> {
  if (_cosmeticCatalog) return _cosmeticCatalog;
  await listCosmetics();
  return _cosmeticCatalog ?? [];
}
export async function purchaseCosmetic(id: string): Promise<{ owned: boolean; credits: number }> {
  const { data, error } = await db().rpc("purchase_cosmetic", { p_id: id });
  if (error) throw error;
  return data as { owned: boolean; credits: number };
}
export async function purchaseCosmeticPackage(id: string): Promise<{
  owned: boolean; credits: number; newItems?: number; ownedIds?: string[]; message?: string;
}> {
  const { data, error } = await db().rpc("purchase_cosmetic_package", { p_id: id });
  if (error) throw error;
  return data as { owned: boolean; credits: number; newItems?: number; ownedIds?: string[]; message?: string };
}
export async function equipCosmetic(id: string): Promise<Record<string, string>> {
  const { data, error } = await db().rpc("equip_cosmetic", { p_id: id });
  if (error) throw error;
  return (data ?? {}) as Record<string, string>;
}
export async function unequipCosmetic(category: string): Promise<Record<string, string>> {
  const { data, error } = await db().rpc("unequip_cosmetic", { p_category: category });
  if (error) throw error;
  return (data ?? {}) as Record<string, string>;
}

export async function adminCosmeticStats(): Promise<AdminCosmeticStats | null> {
  const { data, error } = await db().rpc("admin_cosmetic_stats");
  if (error || !data) return null;
  const d = data as any;
  return {
    topups: {
      paidCount: Number(d.topups?.paidCount ?? 0),
      revenueCents: Number(d.topups?.revenueCents ?? 0),
      creditsIssued: Number(d.topups?.creditsIssued ?? 0),
    },
    purchases: {
      purchases7d: Number(d.purchases?.purchases7d ?? 0),
      uniqueBuyers7d: Number(d.purchases?.uniqueBuyers7d ?? 0),
      packagePurchases7d: Number(d.purchases?.packagePurchases7d ?? 0),
      itemPurchases7d: Number(d.purchases?.itemPurchases7d ?? 0),
      creditsSpent7d: Number(d.purchases?.creditsSpent7d ?? 0),
      ownersTotal: Number(d.purchases?.ownersTotal ?? 0),
    },
    doctrine: String(d.doctrine ?? ""),
  };
}

export async function adminMatchFairness(days = 14): Promise<AdminMatchFairness | null> {
  const { data, error } = await db().rpc("admin_match_fairness_guardrail", { p_days: days });
  if (error || !data) return null;
  const d = data as any;
  return {
    days: Number(d.days ?? days),
    freeUsers: Number(d.freeUsers ?? 0),
    cosmeticOwners: Number(d.cosmeticOwners ?? 0),
    likesFree: Number(d.likesFree ?? 0),
    likesOwners: Number(d.likesOwners ?? 0),
    mutualPairsFree: Number(d.mutualPairsFree ?? 0),
    mutualPairsOwnerTouch: Number(d.mutualPairsOwnerTouch ?? 0),
    mutualPerLikeFree: d.mutualPerLikeFree != null ? Number(d.mutualPerLikeFree) : null,
    mutualPerLikeOwners: d.mutualPerLikeOwners != null ? Number(d.mutualPerLikeOwners) : null,
    deltaMutualRate: d.deltaMutualRate != null ? Number(d.deltaMutualRate) : null,
    alert: !!d.alert,
    cosmeticsExcludedInScores: d.cosmeticsExcludedInScores !== false,
    note: String(d.note ?? ""),
  };
}

/** Fuzzy discipline suggestions for the picker's search box. */
export async function suggestDisciplines(query: string): Promise<DisciplineOption[]> {
  const { data, error } = await db().rpc("suggest_disciplines", { p_query: query });
  if (error || !data) return [];
  return (data as any[]).map((d) => ({ id: d.id, label: d.label, family: d.category ?? "", hasSchema: false }));
}

export interface CustomDisciplineResult { status: "auto_mapped" | "pending"; mappedRoleId: string | null; mappedLabel: string | null }

/** Request a discipline not in the catalog; auto-maps a confident match, else queues it. */
export async function requestCustomDiscipline(label: string): Promise<CustomDisciplineResult> {
  const { data, error } = await db().rpc("request_custom_discipline", { p_label: label });
  if (error) throw error;
  return data as CustomDisciplineResult;
}

/**
 * Fire-and-forget: refresh the caller's semantic embedding (influences/genres/
 * bio → pgvector) so the resonance term in matchmaking reflects their sound.
 * The server function no-ops gracefully if the embedding provider is unavailable.
 */
export async function refreshEmbedding(): Promise<void> {
  try { await db().functions.invoke("embed", { body: {} }); } catch { /* non-fatal */ }
}

// ── Collaborator matching ────────────────────────────────────────────────────
export async function collabMatches(
  limit = 30,
  category: string | null = null,
  filters?: { remoteOnly?: boolean; daw?: string; language?: string },
): Promise<CollabMatch[]> {
  const { data, error } = await db().rpc("collab_matches", {
    p_limit: limit,
    p_category: category,
    p_remote_only: filters?.remoteOnly ? true : null,
    p_daw: filters?.daw || null,
    p_language: filters?.language || null,
  });
  if (error || !data) return [];
  return data.map((r: any) => ({
    userId: r.user_id, username: r.username ?? null,
    offersYouSeek: r.offers_you_seek ?? [], seeksYouOffer: r.seeks_you_offer ?? [],
    mutual: !!r.mutual, sharedGenres: r.shared_genres ?? [], sharedDaws: r.shared_daws ?? [],
    sharedPlugins: r.shared_plugins ?? [], openToWork: !!r.open_to_work,
    resonance: Number(r.resonance ?? 0), reputation: Number(r.reputation ?? 0), fit: Number(r.fit ?? 0),
    sharedDisciplines: r.shared_disciplines ?? [],
    sharedProfessions: r.shared_professions ?? [],
    confidence: Number(r.confidence ?? 0),
    roleClass: r.role_class ?? "creator",
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
    kind: (r.kind === "commission" ? "commission" : "collab"), budget: r.budget ?? null,
  };
}
export async function listOpportunities(limit = 40, kind?: "collab" | "commission"): Promise<Opportunity[]> {
  // Everyone's open posts (browse), newest first, with author username.
  let q = db()
    .from("collab_posts")
    .select("id,author_id,role_needed,title,body,genres,daws,remote_ok,location,commitment,kind,budget,created_at")
    .eq("status", "open");
  if (kind) q = q.eq("kind", kind);
  const { data } = await q.order("created_at", { ascending: false }).limit(limit);
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
    kind: (r.kind === "commission" ? "commission" : "collab"), budget: r.budget ?? null,
  }));
}
export async function createOpportunity(input: {
  roleNeeded: string; title: string; body?: string; genres?: string[];
  daws?: string[]; remoteOk?: boolean; location?: string; commitment?: string;
  kind?: "collab" | "commission"; budget?: string;
}) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_posts").insert({
    author_id: uid, role_needed: input.roleNeeded, title: input.title, body: input.body ?? null,
    genres: input.genres ?? [], daws: input.daws ?? [], remote_ok: input.remoteOk ?? true,
    location: input.location ?? null, commitment: input.commitment ?? null,
    kind: input.kind ?? "collab", budget: input.budget ?? null,
  });
  if (error) throw error;
  void recordSocialScoreEvent("opportunity_post", { kind: input.kind ?? "collab" }).catch(() => undefined);
}
export async function applyToOpportunity(postId: string, message?: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_applications").insert({
    post_id: postId, applicant_id: uid, message: message ?? null,
  });
  if (error) throw error;
}

export interface OpportunityApplication {
  postId: string;
  postTitle: string;
  postKind: "collab" | "commission";
  postStatus: string;
  applicantId: string;
  applicantUsername: string | null;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

/** Poster inbox — applications on my open collab / commission posts. */
export async function myOpportunityInbox(): Promise<OpportunityApplication[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data: posts, error: pe } = await db()
    .from("collab_posts")
    .select("id,title,kind,status")
    .eq("author_id", uid)
    .order("created_at", { ascending: false })
    .limit(40);
  if (pe || !posts?.length) return [];
  const postIds = posts.map((p: any) => p.id as string);
  const postById = new Map(posts.map((p: any) => [p.id as string, p]));
  const { data: apps, error: ae } = await db()
    .from("collab_applications")
    .select("post_id,applicant_id,message,status,created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });
  if (ae || !apps?.length) return [];
  const authors = await usernamesFor(apps.map((a: any) => a.applicant_id));
  return apps.map((a: any) => {
    const post = postById.get(a.post_id);
    const st = a.status === "accepted" || a.status === "rejected" ? a.status : "pending";
    return {
      postId: a.post_id as string,
      postTitle: (post?.title as string) ?? "Untitled",
      postKind: post?.kind === "commission" ? "commission" as const : "collab" as const,
      postStatus: (post?.status as string) ?? "open",
      applicantId: a.applicant_id as string,
      applicantUsername: authors.get(a.applicant_id) ?? null,
      message: (a.message as string | null) ?? null,
      status: st as "pending" | "accepted" | "rejected",
      createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
    };
  });
}

export async function respondOpportunityApplication(
  postId: string,
  applicantId: string,
  accept: boolean,
): Promise<{ status: string; threadId: string | null }> {
  const { data, error } = await db().rpc("respond_opportunity_application", {
    p_post: postId,
    p_applicant: applicantId,
    p_accept: accept,
  });
  if (error) throw error;
  return {
    status: String((data as any)?.status ?? (accept ? "accepted" : "rejected")),
    threadId: ((data as any)?.threadId as string | null) ?? null,
  };
}

export async function closeOpportunity(postId: string, status: "filled" | "closed" = "filled"): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_posts").update({ status }).eq("id", postId).eq("author_id", uid);
  if (error) throw error;
}

// ── Tips (Stripe Connect, Phase O3b) ─────────────────────────────────────────
async function fnErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<any>; text?: () => Promise<string> } }).context;
    if (ctx?.json) { const j = await ctx.json(); if (j?.error) return j.error as string; }
    if (ctx?.text) { const t = await ctx.text(); if (t) return t; }
  } catch { /* ignore */ }
  return (error as Error)?.message ?? fallback;
}

/** Creator: start (or resume) Stripe Connect onboarding; returns a hosted URL. */
export async function startPayoutOnboarding(origin: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke("stripe-connect-onboard", { body: { origin } });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start payout onboarding."));
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.url ?? null;
}

/** Creator: re-sync payout readiness from Stripe (call on return from onboarding). */
export async function refreshPayoutStatus(origin: string): Promise<{ hasAccount: boolean; chargesEnabled: boolean; detailsSubmitted: boolean }> {
  const { data } = await db().functions.invoke("stripe-connect-onboard", { body: { origin, refresh: true } });
  return {
    hasAccount: !!(data as any)?.hasAccount,
    chargesEnabled: !!(data as any)?.chargesEnabled,
    detailsSubmitted: !!(data as any)?.detailsSubmitted,
  };
}

export async function myPayoutStatus(): Promise<{ hasAccount: boolean; chargesEnabled: boolean; detailsSubmitted: boolean }> {
  const { data } = await db().rpc("my_payout_status");
  return {
    hasAccount: !!(data as any)?.hasAccount,
    chargesEnabled: !!(data as any)?.chargesEnabled,
    detailsSubmitted: !!(data as any)?.detailsSubmitted,
  };
}

export async function creatorTipsEnabled(uid: string): Promise<boolean> {
  const { data } = await db().rpc("creator_tips_enabled", { p_uid: uid });
  return !!data;
}

export async function tipsSummary(uid: string): Promise<{ count: number; supporters: number }> {
  const { data } = await db().rpc("tips_summary", { p_uid: uid });
  return { count: Number((data as any)?.count ?? 0), supporters: Number((data as any)?.supporters ?? 0) };
}

/** Supporter: start a tip Checkout to a creator; returns a hosted Checkout URL. */
export async function startTip(toUserId: string, amountCents: number, origin: string, message?: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke("stripe-tip", { body: { toUserId, amountCents, origin, message } });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start tip."));
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.url ?? null;
}

/** Buyer: start a cosmetic-credit pack Checkout (platform charge); returns hosted URL. */
export async function startCreditTopup(packId: string, origin: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke("stripe-credit-topup", { body: { packId, origin } });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start credit top-up."));
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.url ?? null;
}

/** Buyer: start an AI minute pack Checkout (platform charge); returns hosted URL. */
export async function startAiMinuteTopup(packId: string, origin: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke("ai-topup", { body: { packId, origin } });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start AI minute top-up."));
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.url ?? null;
}

/** Prepaid AI mastering seconds balance (RPC). Returns null if offline / unauthenticated. */
export async function fetchAiCreditBalance(): Promise<number | null> {
  try {
    const { data, error } = await db().rpc("get_ai_credit_balance");
    if (error) return null;
    return Number(data ?? 0);
  } catch {
    return null;
  }
}

export type AiCreditLedgerApiRow = {
  id: string;
  delta_seconds: number;
  usd: number;
  reason: string;
  created_at: string;
};

/** Recent AI credit ledger rows for the signed-in user. */
export async function fetchAiCreditLedger(limit = 40): Promise<AiCreditLedgerApiRow[]> {
  try {
    const { data, error } = await db()
      .from("ai_credit_ledger")
      .select("id, delta_seconds, usd, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: String(r.id),
      delta_seconds: Number(r.delta_seconds),
      usd: Number(r.usd),
      reason: String(r.reason),
      created_at: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

export type VisualStylePreset = "glass" | "aurora" | "waveform" | "stage" | "ember";

export interface VisualGenerateResult {
  ok: boolean;
  imageUrl?: string;
  stylePreset?: string;
  costVc?: number;
  credits?: number;
  remainingToday?: number;
  error?: string;
}

/** AI still for Visualizer Studio (Edge → fal Flux). Costs Vc; daily cap. */
export async function generateVisualizerStill(
  prompt: string,
  opts?: { stylePreset?: VisualStylePreset; aspect?: "16:9" | "1:1" | "9:16" },
): Promise<VisualGenerateResult> {
  const { data, error } = await db().functions.invoke("visual-generate", {
    body: {
      prompt,
      stylePreset: opts?.stylePreset ?? "glass",
      aspect: opts?.aspect ?? "16:9",
    },
  });
  if (error) {
    return { ok: false, error: await fnErrorMessage(error, "Could not generate visual.") };
  }
  const d = data as VisualGenerateResult & { remaining_today?: number };
  if (d?.error && !d.ok) {
    return {
      ok: false,
      error: String(d.error),
      credits: d.credits,
      remainingToday: d.remainingToday ?? d.remaining_today,
      costVc: d.costVc ?? 2,
    };
  }
  return {
    ok: true,
    imageUrl: d.imageUrl,
    stylePreset: d.stylePreset,
    costVc: d.costVc ?? 2,
    credits: d.credits,
    remainingToday: d.remainingToday ?? d.remaining_today,
  };
}

// ── Sample Pack Storefront ───────────────────────────────────────────────────

function mapStorefrontPack(r: Record<string, unknown>): StorefrontPack {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    description: String(r.description ?? ""),
    features: Array.isArray(r.features) ? r.features.map(String) : [],
    genre: String(r.genre ?? ""),
    price_cents: Number(r.price_cents ?? 0),
    currency: String(r.currency ?? "usd"),
    preview_path: r.preview_path ? String(r.preview_path) : null,
    zip_path: r.zip_path ? String(r.zip_path) : null,
    cover_path: r.cover_path ? String(r.cover_path) : null,
    status: (r.status === "published" ? "published" : "draft"),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

function mapStorefrontPackPublic(r: Record<string, unknown>): StorefrontPackPublic {
  const p = mapStorefrontPack(r);
  return {
    id: p.id,
    user_id: p.user_id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    features: p.features,
    genre: p.genre,
    price_cents: p.price_cents,
    currency: p.currency,
    preview_path: p.preview_path,
    cover_path: p.cover_path,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export async function listMyStorefrontPacks(): Promise<StorefrontPack[]> {
  const { data, error } = await db()
    .from("storefront_packs")
    .select("id, user_id, title, slug, description, features, genre, price_cents, currency, preview_path, cover_path, status, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapStorefrontPack({ ...r, zip_path: null } as Record<string, unknown>));
}

export async function getMyStorefrontPack(id: string): Promise<StorefrontPack | null> {
  const { data, error } = await db().rpc("storefront_my_pack", { p_id: id });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapStorefrontPack(data as Record<string, unknown>);
}

export async function getPublishedStorefrontPack(slug: string): Promise<StorefrontPackPublic | null> {
  const { data, error } = await db().rpc("storefront_pack_by_slug", { p_slug: slug });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapStorefrontPackPublic(data as Record<string, unknown>);
}

/**
 * Published pack catalog for Market browse.
 * Reads `storefront_packs_public` only — never zip_path; empty list is a measured zero.
 */
export async function listPublishedStorefrontPacks(limit = 48): Promise<StorefrontPackPublic[]> {
  const capped = Math.max(1, Math.min(100, Math.floor(limit)));
  const { data, error } = await db()
    .from("storefront_packs_public")
    .select("id, user_id, title, slug, description, features, genre, price_cents, currency, preview_path, cover_path, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(capped);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapStorefrontPackPublic(r as Record<string, unknown>));
}

export async function createStorefrontPack(input: {
  title: string;
  slug?: string;
  description?: string;
  features?: string[];
  genre?: string;
  price_cents: number;
  preview_path?: string | null;
  zip_path?: string | null;
  cover_path?: string | null;
  status?: "draft" | "published";
}): Promise<StorefrontPack | null> {
  const { data: sess } = await db().auth.getUser();
  const uid = sess.user?.id;
  if (!uid) throw new Error("Sign in required");
  const slug = input.slug?.trim() || uniqueSlug(input.title);
  const { data, error } = await db()
    .from("storefront_packs")
    .insert({
      user_id: uid,
      title: input.title,
      slug,
      description: input.description ?? "",
      features: input.features ?? [],
      genre: input.genre ?? "",
      price_cents: input.price_cents,
      preview_path: input.preview_path ?? null,
      zip_path: input.zip_path ?? null,
      cover_path: input.cover_path ?? null,
      status: input.status ?? "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return getMyStorefrontPack(String(data.id));
}

export async function updateStorefrontPack(
  id: string,
  input: Partial<{
    title: string;
    slug: string;
    description: string;
    features: string[];
    genre: string;
    price_cents: number;
    preview_path: string | null;
    zip_path: string | null;
    cover_path: string | null;
    status: "draft" | "published";
  }>,
): Promise<StorefrontPack | null> {
  const { error } = await db()
    .from("storefront_packs")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return getMyStorefrontPack(id);
}

export async function listMyStorefrontOrders(): Promise<StorefrontOrder[]> {
  const { data, error } = await db()
    .from("storefront_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    pack_id: String(r.pack_id),
    buyer_email: String(r.buyer_email),
    buyer_user_id: r.buyer_user_id ? String(r.buyer_user_id) : null,
    amount_cents: Number(r.amount_cents),
    application_fee_cents: Number(r.application_fee_cents ?? 0),
    stripe_session_id: r.stripe_session_id ? String(r.stripe_session_id) : null,
    stripe_payment_intent: r.stripe_payment_intent ? String(r.stripe_payment_intent) : null,
    status: r.status as StorefrontOrder["status"],
    settlement_status: (r.settlement_status as StorefrontOrder["settlement_status"]) || "pending_manual",
    fulfilled_at: r.fulfilled_at ? String(r.fulfilled_at) : null,
    created_at: String(r.created_at),
  }));
}

/** Pack owner marks order settled after manual ACH/Zelle/Vc payout. */
export async function settleStorefrontOrder(orderId: string): Promise<{ id: string; settlement_status: string }> {
  const { data, error } = await db().rpc("storefront_settle_order", { p_order_id: orderId });
  if (error) throw new Error(error.message);
  const row = data as { id?: string; settlement_status?: string } | null;
  if (!row?.id) throw new Error("Could not settle order");
  return { id: String(row.id), settlement_status: String(row.settlement_status ?? "settled_off_platform") };
}

export async function uploadStorefrontPreview(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
  const path = `${userId}/previews/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(STOREFRONT_PREVIEWS_BUCKET).upload(path, file, {
    contentType: file.type || "audio/mpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function uploadStorefrontZip(userId: string, file: File): Promise<string> {
  const path = `${userId}/zips/${crypto.randomUUID()}.zip`;
  const { error } = await db().storage.from(STOREFRONT_ZIPS_BUCKET).upload(path, file, {
    contentType: file.type || "application/zip",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function generateStorefrontPackCopy(
  keywords: string,
  genre?: string,
): Promise<PackCopyResult | null> {
  const { data, error } = await db().functions.invoke("storefront-pack-copy", {
    body: { keywords, genre },
  });
  if (error) throw new Error(await fnErrorMessage(error, "Could not generate copy."));
  const d = data as { title?: string; description?: string; features?: string[]; error?: string };
  if (d?.error) throw new Error(d.error);
  if (!d?.title || !d?.description) return null;
  return {
    title: String(d.title),
    description: String(d.description),
    features: Array.isArray(d.features) ? d.features.map(String).slice(0, 5) : [],
  };
}

export async function generateStorefrontPackArt(opts: {
  title: string;
  genre?: string;
  packId?: string;
  palette?: string;
}): Promise<string | null> {
  const { data, error } = await db().functions.invoke("storefront-pack-art", {
    body: opts,
  });
  if (error) throw new Error(await fnErrorMessage(error, "Could not generate cover art."));
  const d = data as { coverPath?: string; error?: string };
  if (d?.error) throw new Error(d.error);
  return d?.coverPath ? String(d.coverPath) : null;
}

/** Guest-friendly Checkout for a published pack; returns hosted Stripe URL. */
export async function startStorefrontCheckout(packId: string, origin: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke("storefront-checkout", {
    body: { packId, origin },
  });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start checkout."));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { url?: string })?.url ?? null;
}

/** Weekly best-fit digest opt-in (Resend). Default off. */
export async function getDigestOptIn(): Promise<boolean> {
  const { data } = await db().rpc("my_digest_opt_in");
  return !!data;
}

export async function setDigestOptIn(on: boolean): Promise<boolean> {
  const { data, error } = await db().rpc("set_digest_opt_in", { p_on: on });
  if (error) throw new Error(error.message);
  return !!data;
}

// ── OAuth connectors (Phase C3) ──────────────────────────────────────────────
export interface OAuthConnection {
  id: string;
  provider: string;
  externalId: string | null;
  meta: Record<string, unknown>;
  expiresAt: number | null;
  connectedAt: number;
}

export async function listOAuth(): Promise<OAuthConnection[]> {
  const { data } = await db().rpc("list_my_oauth");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    provider: r.provider,
    externalId: r.external_id ?? null,
    meta: (r.meta ?? {}) as Record<string, unknown>,
    expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
    connectedAt: r.connected_at ? new Date(r.connected_at).getTime() : Date.now(),
  }));
}

export async function startOAuth(provider: string, projectId?: string): Promise<string> {
  const { data, error } = await db().functions.invoke("oauth-start", {
    body: { provider, projectId: projectId ?? null },
  });
  if (error) throw new Error(await fnErrorMessage(error, "Could not start OAuth."));
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  const url = (data as any)?.url;
  if (!url) throw new Error("No authorize URL returned.");
  return url as string;
}

export async function disconnectOAuth(provider: string): Promise<void> {
  const { error } = await db().rpc("disconnect_oauth", { p_provider: provider });
  if (error) throw error;
}

// ── Affiliates (Phase J) ─────────────────────────────────────────────────────
export interface AffiliateLink {
  id: string;
  userId: string;
  label: string;
  url: string;
  merchant: string | null;
  disclosed: boolean;
  sort: number;
}

export async function listAffiliateLinks(userId: string): Promise<AffiliateLink[]> {
  const { data } = await db().from("affiliate_links")
    .select("id,user_id,label,url,merchant,disclosed,sort")
    .eq("user_id", userId)
    .order("sort", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id, userId: r.user_id, label: r.label, url: r.url,
    merchant: r.merchant ?? null, disclosed: !!r.disclosed, sort: r.sort ?? 0,
  }));
}

export async function upsertAffiliateLink(input: {
  id?: string; label: string; url: string; merchant?: string | null;
}): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  if (input.id) {
    const { error } = await db().from("affiliate_links").update({
      label: input.label.trim(), url: input.url.trim(),
      merchant: input.merchant?.trim() || null, disclosed: true,
    }).eq("id", input.id).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await db().from("affiliate_links").insert({
      user_id: uid, label: input.label.trim(), url: input.url.trim(),
      merchant: input.merchant?.trim() || null, disclosed: true,
    });
    if (error) throw error;
  }
}

export async function deleteAffiliateLink(id: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("affiliate_links").delete().eq("id", id).eq("user_id", uid);
}

// ── Swarm manifest (Phase H) ─────────────────────────────────────────────────
export async function swarmAssetManifest(assetId: string): Promise<{
  assetId: string; chunkSize: number | null; chunkHashes: string[];
  cipherAlgo: string | null; contentKeyEnvelope: unknown; byteSize: number;
} | null> {
  const { data, error } = await db().rpc("swarm_asset_manifest", { p_asset: assetId });
  if (error || !data?.length) return null;
  const r = data[0] as any;
  return {
    assetId: r.asset_id,
    chunkSize: r.chunk_size ?? null,
    chunkHashes: r.chunk_hashes ?? [],
    cipherAlgo: r.cipher_algo ?? null,
    contentKeyEnvelope: r.content_key_envelope ?? null,
    byteSize: Number(r.byte_size ?? 0),
  };
}

/** ICE servers for WebRTC (STUN + optional TURN from edge secrets). */
let iceCache: { at: number; servers: RTCIceServer[]; turnConfigured: boolean } | null = null;
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const status = await fetchIceStatus();
  return status.iceServers;
}

export async function fetchIceStatus(): Promise<{ iceServers: RTCIceServer[]; turnConfigured: boolean }> {
  const now = Date.now();
  if (iceCache && now - iceCache.at < 8 * 60_000) {
    return { iceServers: iceCache.servers, turnConfigured: iceCache.turnConfigured };
  }
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  try {
    const { data, error } = await db().functions.invoke("ice-servers", { body: {} });
    if (error || !(data as any)?.iceServers) {
      return { iceServers: fallback, turnConfigured: false };
    }
    const servers = (data as any).iceServers as RTCIceServer[];
    const turnConfigured = !!(data as any).turnConfigured;
    iceCache = { at: now, servers, turnConfigured };
    return { iceServers: servers, turnConfigured };
  } catch {
    return { iceServers: fallback, turnConfigured: false };
  }
}

/** Bunny Stream live ingest readiness (edge secrets; no create side-effects). */
export async function fetchBunnyLiveStatus(): Promise<{ configured: boolean }> {
  try {
    const { data: sess } = await db().auth.getSession();
    const token = sess.session?.access_token;
    if (!token || !SUPABASE_URL) return { configured: false };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/bunny-live`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "status" }),
    });
    const body = await res.json().catch(() => ({}));
    return { configured: !!(body as { configured?: boolean }).configured };
  } catch {
    return { configured: false };
  }
}

export interface InfraGatesStatus {
  turnConfigured: boolean;
  bunnyLiveConfigured: boolean;
  checkedAt: number;
}

/** Combined infra readiness for Go Live / Admin (never invents credentials). */
export async function fetchInfraGates(): Promise<InfraGatesStatus> {
  const [ice, bunny] = await Promise.all([fetchIceStatus(), fetchBunnyLiveStatus()]);
  return {
    turnConfigured: ice.turnConfigured,
    bunnyLiveConfigured: bunny.configured,
    checkedAt: Date.now(),
  };
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

/**
 * The name a creator is known by in social surfaces — chat, rooms, presence.
 *
 * VYBZ shows the artist / producer name rather than a handle. Precedence:
 *   1. `artist_profiles.display_name` for a linked artist entity
 *   2. `profiles.display_name` — the creator name every profile can carry
 *   3. `username` — handle of last resort
 *
 * An artist entity is optional and gated behind tagged drops, so tier 2 is what
 * most users resolve to today; tier 1 takes over automatically once they claim one.
 */
export async function creatorNamesFor(ids: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  const m = new Map<string, string>();
  if (!uniq.length) return m;

  const [profiles, members] = await Promise.all([
    db().from("public_profiles").select("id,username,display_name").in("id", uniq),
    // Artist link is optional; never let a restricted read break chat rendering.
    db()
      .from("artist_members")
      .select("user_id, artist_profiles(display_name, created_at)")
      .in("user_id", uniq)
      .then(
        (r) => r as { data: unknown[] | null },
        () => ({ data: null }) as { data: unknown[] | null },
      ),
  ]);

  (profiles.data ?? []).forEach((r: any) => {
    const name = (r.display_name as string | null)?.trim() || (r.username as string | null)?.trim();
    if (name) m.set(r.id, name);
  });

  // Deterministic when a user belongs to several artists: earliest claimed wins.
  const byUser = new Map<string, { name: string; createdAt: number }>();
  (members.data ?? []).forEach((r: any) => {
    const artist = Array.isArray(r.artist_profiles) ? r.artist_profiles[0] : r.artist_profiles;
    const name = (artist?.display_name as string | null)?.trim();
    if (!name) return;
    const createdAt = artist?.created_at ? Date.parse(artist.created_at) : Number.MAX_SAFE_INTEGER;
    const existing = byUser.get(r.user_id);
    if (!existing || createdAt < existing.createdAt) byUser.set(r.user_id, { name, createdAt });
  });
  byUser.forEach((v, userId) => m.set(userId, v.name));

  return m;
}

// ── Assets + upload ──────────────────────────────────────────────────────────
/** Secure-zone (token-authed Bunny) paths look like `drops/…` or `projects/…`. */
const isSecurePath = (p: string) => /^(drops|projects|repo-blobs)\//.test(p);

/** No byte has moved for this long while sending — the connection is gone, not slow. */
const UPLOAD_STALL_MS = 60_000;
/** After the last byte the server is still finalizing, so it gets a longer leash. */
const UPLOAD_ACK_STALL_MS = 180_000;
/** How often the watchdog checks; the window it enforces is the constant above. */
const UPLOAD_WATCHDOG_TICK_MS = 5_000;

export type UploadFailureReason = "rejected" | "network" | "stalled";

/**
 * Abort an upload that has stopped making progress.
 *
 * Deliberately not `xhr.timeout`: a large master legitimately takes a long time,
 * and a total-duration cap would kill uploads that are working. What is never
 * legitimate is silence — no progress event and no acknowledgement — which is
 * exactly the state a hung upload sits in forever otherwise.
 */
function watchUploadForStall(xhr: XMLHttpRequest, onStall: () => void): () => void {
  let lastActivity = Date.now();
  let limitMs = UPLOAD_STALL_MS;
  const onUploadProgress = () => {
    lastActivity = Date.now();
  };
  const onUploadEnd = () => {
    lastActivity = Date.now();
    limitMs = UPLOAD_ACK_STALL_MS;
  };
  const stop = () => {
    clearInterval(timer);
    xhr.upload.removeEventListener("progress", onUploadProgress);
    xhr.upload.removeEventListener("loadend", onUploadEnd);
  };
  xhr.upload.addEventListener("progress", onUploadProgress);
  xhr.upload.addEventListener("loadend", onUploadEnd);
  const timer = setInterval(() => {
    if (Date.now() - lastActivity < limitMs) return;
    stop();
    onStall();
    xhr.abort();
  }, UPLOAD_WATCHDOG_TICK_MS);
  return stop;
}

/**
 * Upload a protected drop original to Supabase Storage (`audio-assets`).
 * Path shape `{uid}/drops/{ts}-{id}.{ext}` — matches bucket RLS (folder = auth.uid()).
 * Bunny CDN is optional (`FLAGS.bunnyAudio`); default path no longer burns Bunny credits.
 *
 * Resolves the stored path, or null. `onFailure` says which kind of null it is so
 * callers can tell a rejection from a dead connection.
 */
export async function uploadAudio(
  file: Blob,
  ext: string,
  onProgress?: (pct: number) => void,
  onFailure?: (reason: UploadFailureReason) => void,
): Promise<string | null> {
  const sess = (await db().auth.getSession()).data.session;
  if (!sess?.user?.id) return null;
  const uid = sess.user.id;
  const ct = (file as File).type || (ext === "wav" ? "audio/wav" : ext === "flac" ? "audio/flac" : "audio/mpeg");
  const path = `${uid}/drops/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  // Prefer Bunny only when explicitly re-enabled.
  if (FLAGS.bunnyAudio) {
    const endpoint = `${SUPABASE_URL}/functions/v1/bunny-upload?kind=drop&name=${encodeURIComponent("a." + ext)}`;
    return new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.setRequestHeader("authorization", `Bearer ${sess.access_token}`);
      xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
      xhr.setRequestHeader("content-type", ct);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      const stopWatchdog = watchUploadForStall(xhr, () => {
        console.warn("[uploadAudio] stalled — no progress, aborting");
        onFailure?.("stalled");
      });
      xhr.onload = () => {
        stopWatchdog();
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve((JSON.parse(xhr.responseText).path as string) ?? null); } catch { resolve(null); }
        } else {
          onFailure?.("rejected");
          resolve(null);
        }
      };
      xhr.onerror = () => {
        stopWatchdog();
        onFailure?.("network");
        resolve(null);
      };
      xhr.onabort = () => {
        stopWatchdog();
        resolve(null);
      };
      xhr.send(file);
    });
  }

  // Supabase Storage — XHR against the object API for real upload progress.
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${path}`;
  return new Promise<string | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${sess.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("content-type", ct);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    const stopWatchdog = watchUploadForStall(xhr, () => {
      console.warn("[uploadAudio] stalled — no progress, aborting");
      onFailure?.("stalled");
    });
    xhr.onload = () => {
      stopWatchdog();
      if (xhr.status >= 200 && xhr.status < 300) resolve(path);
      else {
        console.warn("[uploadAudio] storage rejected", xhr.status, String(xhr.responseText || "").slice(0, 240));
        onFailure?.("rejected");
        resolve(null);
      }
    };
    xhr.onerror = () => {
      stopWatchdog();
      console.warn("[uploadAudio] network error");
      onFailure?.("network");
      resolve(null);
    };
    xhr.onabort = () => {
      stopWatchdog();
      resolve(null);
    };
    xhr.send(file);
  });
}

/** A feed can ask for hundreds of paths at once; keep each mint request bounded. */
const PLAY_TICKET_BATCH = 50;

/** Mint playback URLs via audio-play tickets (Bunny Storage stream or Supabase signed). */
async function mintPlayUrls(paths: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (!paths.length) return m;
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) return m;

  const batches: string[][] = [];
  for (let i = 0; i < paths.length; i += PLAY_TICKET_BATCH) {
    batches.push(paths.slice(i, i + PLAY_TICKET_BATCH));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/audio-play`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${sess.access_token}`,
            apikey: SUPABASE_ANON_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({ paths: batch }),
        });
        if (!res.ok) return null;
        return (await res.json().catch(() => null)) as { urls?: Record<string, string> } | null;
      } catch {
        // A failed batch yields no URLs for those paths; callers already treat a
        // missing URL as unplayable rather than rendering a broken player.
        return null;
      }
    }),
  );

  for (const j of results) {
    Object.entries(j?.urls ?? {}).forEach(([k, v]) => m.set(k, v));
  }
  return m;
}

/** Mint short-lived token URLs for secure-zone paths via the bunny-sign function. */
async function bunnySign(paths: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const secure = paths.filter(isSecurePath);
  if (!secure.length) return m;
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) return m;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bunny-sign`, {
    method: "POST",
    headers: { authorization: `Bearer ${sess.access_token}`, apikey: SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ paths: secure }),
  });
  if (!res.ok) return m;
  const j = await res.json().catch(() => null);
  Object.entries((j?.urls as Record<string, string>) ?? {}).forEach(([k, v]) => m.set(k, v));
  return m;
}

/**
 * Resolve stored paths to playable URLs through the playback authority.
 *
 * `audio-play` is the only thing that evaluates `can_user_play_path`, so it is the
 * only thing allowed to hand out a way to reach the bytes. The client must never
 * sign storage objects for playback: it holds an anon key against a bucket policy
 * that cannot see a drop's audience, so signing here would authorise everyone.
 *
 * The Bunny CDN branch survives only behind `FLAGS.bunnyAudio`, which is off, and
 * `bunny-sign` performs its own server-side check.
 */
async function signAudio(paths: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const real = Array.from(
    new Set(paths.filter((p) => p && !/^(https?:|data:|blob:)/i.test(p))),
  );
  if (!real.length) return m;

  // Legacy Bunny CDN token auth, disabled by default.
  if (FLAGS.bunnyAudio) {
    const secure = real.filter(isSecurePath);
    if (secure.length) (await bunnySign(secure)).forEach((v, k) => m.set(k, v));
  }

  // Everything else — including `{uid}/drops/…` — goes through the ticket path.
  const remaining = real.filter((p) => !m.has(p));
  if (remaining.length) {
    (await mintPlayUrls(remaining)).forEach((v, k) => m.set(k, v));
  }

  return m;
}

/** Resolve any stored asset path / URL to a browser-playable https URL. */
export async function resolveAudioUrl(urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;
  if (/^(https?:|blob:|data:)/i.test(urlOrPath)) return urlOrPath;
  const signed = await signAudio([urlOrPath]);
  return signed.get(urlOrPath) ?? null;
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
  license?: string;
  sha256?: string; fingerprint?: string;
  fx?: PostFx;
  audience?: PostAudience;
  inviteeIds?: string[];
  playbackCustomization?: PlaybackCustomization;
  creditedArtist?: string;
  album?: string;
  releaseType?: ReleaseType;
  /** Optional Studio bulk-release group. */
  releaseBatchId?: string;
}
export async function createDrop(input: NewDrop): Promise<Drop | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const audience = input.audience ?? "public";
  const fx = input.fx ?? input.playbackCustomization?.reactiveStyle ?? "glow";
  const playback = buildPlaybackCustomization(input.playbackCustomization ?? {}, fx);
  let assetId: string | null = null;
  if (input.audioUrl) {
    const assetPayload: Record<string, unknown> = {
      owner_id: uid, kind: input.assetKind, title: input.title || "Untitled",
      url: input.audioUrl, waveform: input.waveform ?? null, duration_sec: input.durationSec ?? null,
      bpm: input.bpm ?? null, musical_key: input.musicalKey ?? null, format: input.audioFormat ?? null,
      sample_rate: input.sampleRate ?? null, lossless: input.lossless ?? false,
      license: input.license ?? "collab-only",
      sha256: input.sha256 ?? null, fingerprint: input.fingerprint ?? null,
      playback_customization: playback,
    };
    let { data: asset, error: aerr } = await db().from("assets").insert(assetPayload).select("id").single();
    if (aerr) {
      delete assetPayload.playback_customization;
      ({ data: asset, error: aerr } = await db().from("assets").insert(assetPayload).select("id").single());
    }
    if (aerr || !asset) return null;
    assetId = (asset as { id: string }).id;
  }
  const credited = input.creditedArtist?.trim() || null;
  const album = input.album?.trim() || null;
  const releaseType = input.releaseType || null;
  const batchId = input.releaseBatchId || null;
  let drop: { id: string; created_at: string } | null = null;
  {
    const res = await db().from("drops").insert({
      author_id: uid, title: input.title ?? null, body: input.body ?? null,
      asset_id: assetId, seed: input.seed, fx, audience,
      playback_customization: playback,
      credited_artist: credited,
      album,
      release_type: releaseType,
      release_batch_id: batchId,
    }).select("id,created_at").single();
    if (!res.error && res.data) drop = res.data as { id: string; created_at: string };
    else {
      const mid = await db().from("drops").insert({
        author_id: uid, title: input.title ?? null, body: input.body ?? null,
        asset_id: assetId, seed: input.seed, fx, audience,
        playback_customization: playback,
        credited_artist: credited,
        album,
        release_type: releaseType,
      }).select("id,created_at").single();
      if (!mid.error && mid.data) drop = mid.data as { id: string; created_at: string };
      else {
        const mid2 = await db().from("drops").insert({
          author_id: uid, title: input.title ?? null, body: input.body ?? null,
          asset_id: assetId, seed: input.seed, fx, audience,
          credited_artist: credited,
          album,
          release_type: releaseType,
        }).select("id,created_at").single();
        if (!mid2.error && mid2.data) drop = mid2.data as { id: string; created_at: string };
        else {
          const mid3 = await db().from("drops").insert({
            author_id: uid, title: input.title ?? null, body: input.body ?? null,
            asset_id: assetId, seed: input.seed, fx, audience,
            credited_artist: credited,
          }).select("id,created_at").single();
          if (!mid3.error && mid3.data) drop = mid3.data as { id: string; created_at: string };
          else {
            const mid4 = await db().from("drops").insert({
              author_id: uid, title: input.title ?? null, body: input.body ?? null,
              asset_id: assetId, seed: input.seed, fx, audience,
            }).select("id,created_at").single();
            if (!mid4.error && mid4.data) drop = mid4.data as { id: string; created_at: string };
            else {
              const fallback = await db().from("drops").insert({
                author_id: uid, title: input.title ?? null, body: input.body ?? null,
                asset_id: assetId, seed: input.seed,
              }).select("id,created_at").single();
              if (fallback.error || !fallback.data) return null;
              drop = fallback.data as { id: string; created_at: string };
            }
          }
        }
      }
    }
  }
  if (!drop) return null;
  if (audience === "private" && input.inviteeIds?.length) {
    const rows = input.inviteeIds.filter((id) => id && id !== uid).map((invitee_id) => ({
      drop_id: drop!.id, invitee_id,
    }));
    if (rows.length) await db().from("drop_invites").upsert(rows).then(() => undefined, () => undefined);
  }
  void recordSocialScoreEvent("drop_publish", {
    assetKind: input.assetKind,
    audience,
  }).catch(() => undefined);
  const signed = input.audioUrl ? (await signAudio([input.audioUrl])).get(input.audioUrl) : undefined;
  return {
    id: drop.id, authorId: uid, authorUsername: null, title: input.title ?? null,
    body: input.body ?? null, seed: input.seed, feels: 0, wilds: 0,
    createdAt: new Date(drop.created_at).getTime(), assetId,
    audioUrl: signed ?? input.audioUrl, waveform: input.waveform, durationSec: input.durationSec,
    assetKind: input.assetKind, bpm: input.bpm ?? null, musicalKey: input.musicalKey ?? null,
    audioFormat: input.audioFormat ?? null, sampleRate: input.sampleRate ?? null, lossless: input.lossless,
    license: input.license ?? "collab-only",
    fx, audience, playbackCustomization: playback,
    creditedArtist: credited,
    album,
    releaseType,
  };
}

/** Create a Studio release batch (bulk upload group). Returns id or null. */
export async function createReleaseBatch(input: {
  title?: string;
  creditedArtist?: string;
}): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await db().from("release_batches").insert({
    owner_id: uid,
    title: input.title?.trim() || null,
    credited_artist: input.creditedArtist?.trim() || null,
  }).select("id").single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

async function assembleDrops(rows: any[], myId: string | null): Promise<Drop[]> {
  if (!rows.length) return [];
  const authors = await usernamesFor(rows.map((r) => r.author_id));
  const assetIds = rows.map((r) => r.asset_id).filter(Boolean);
  const assetMap = new Map<string, any>();
  if (assetIds.length) {
    const { data } = await db().from("assets")
      .select("id,kind,url,waveform,duration_sec,bpm,musical_key,format,sample_rate,lossless,license,rating_avg,rating_count")
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
      audioUrl: a ? (() => {
        const resolved = signed.get(a.url) ?? a.url;
        return /^(https?:|blob:|data:)/i.test(resolved) ? resolved : undefined;
      })() : undefined,
      waveform: a?.waveform ?? undefined, durationSec: a?.duration_sec ?? undefined,
      assetKind: a?.kind ?? undefined, bpm: a?.bpm ?? null, musicalKey: a?.musical_key ?? null,
      audioFormat: a?.format ?? null, sampleRate: a?.sample_rate ?? null, lossless: a?.lossless ?? false,
      license: a?.license ?? null,
      rating: a ? Number(a.rating_avg ?? 0) : undefined,
      ratingCount: a ? Number(a.rating_count ?? 0) : undefined,
      plays: r.plays ?? 0,
      fx: r.fx ?? "glow",
      audience: r.audience ?? "public",
      playbackCustomization: parsePlaybackCustomization(r.playback_customization),
      creditedArtist: r.credited_artist ?? null,
      artistId: r.artist_id ?? null,
      album: r.album ?? null,
      releaseType: r.release_type ?? null,
      myReaction: myReactions.get(r.id), myRating: r.asset_id ? myRatings.get(r.asset_id) : undefined,
    } as Drop & { myReaction?: Reaction; myRating?: number };
  });
}

export async function listDrops(limit = 40): Promise<(Drop & { myReaction?: Reaction; myRating?: number })[]> {
  const myId = await currentUserId();
  // Prefer RPC that enforces audience; fall back to filtered select.
  const { data: rpc, error } = await db().rpc("list_visible_drops", { p_limit: limit });
  if (!error && Array.isArray(rpc)) return assembleDrops(rpc, myId);
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id,album,release_type")
    .eq("audience", "public")
    .order("created_at", { ascending: false }).limit(limit);
  return assembleDrops(data ?? [], myId);
}

/** Public works from specific creators. Used by the Network Following stream. */
export async function listDropsFromAuthors(
  authorIds: string[],
  limit = 50,
): Promise<(Drop & { myReaction?: Reaction; myRating?: number })[]> {
  if (!authorIds.length) return [];
  const myId = await currentUserId();
  const { data } = await db()
    .from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id,album,release_type")
    .in("author_id", authorIds.slice(0, 80))
    .eq("audience", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  return assembleDrops(data ?? [], myId);
}

/** Exact number of drops an author owns — lets the library state a true total. */
export async function countDropsBy(authorId: string): Promise<number> {
  const { count, error } = await db().from("drops")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId);
  return error ? 0 : (count ?? 0);
}

export async function dropsBy(authorId: string, limit = 40, offset = 0) {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id,album,release_type")
    .eq("author_id", authorId).order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  // Owner sees all; others rely on RLS / client filter for private
  const rows = (data ?? []).filter((r: any) => {
    if (myId && r.author_id === myId) return true;
    if ((r.audience ?? "public") === "public") return true;
    return false; // followers/private for others come through RPC paths
  });
  return assembleDrops(myId === authorId ? (data ?? []) : rows, myId);
}

// ── Manage your own drops (Library) — owner-scoped via RLS + a guarded RPC ────
/** Delete one of your own drops (RLS enforces ownership). */
export async function deleteDrop(id: string): Promise<boolean> {
  const { error } = await db().from("drops").delete().eq("id", id);
  return !error;
}
/** Rename one of your own drops (RLS enforces ownership). */
export async function updateDropTitle(id: string, title: string): Promise<boolean> {
  const { error } = await db().from("drops").update({ title: title.trim() || null }).eq("id", id);
  return !error;
}
/** Feature a drop on your profile (or pass null to clear). Server verifies ownership. */
export async function setFeaturedDrop(dropId: string | null): Promise<boolean> {
  const { error } = await db().rpc("set_featured_drop", { p_drop: dropId });
  return !error;
}

// ── Official Artist Profiles (Phase 2 · model 1A linked entities) ─────────────
function toArtist(r: Record<string, unknown>): ArtistProfile {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    displayName: String(r.display_name ?? ""),
    bio: (r.bio as string | null) ?? null,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    coverUrl: (r.cover_url as string | null) ?? null,
    primaryGenres: Array.isArray(r.primary_genres) ? (r.primary_genres as string[]) : [],
    verifiedAt: r.verified_at ? new Date(String(r.verified_at)).getTime() : null,
    createdBy: String(r.created_by ?? ""),
    createdAt: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
  };
}

export function normalizeArtistSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function artistSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await db().rpc("artist_slug_available", { p_slug: slug });
  if (error) return false;
  return !!data;
}

export async function getArtistBySlug(slug: string): Promise<ArtistProfile | null> {
  const { data, error } = await db().rpc("get_artist_by_slug", { p_slug: slug });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? toArtist(row as Record<string, unknown>) : null;
}

export async function artistsForUser(userId: string): Promise<ArtistProfile[]> {
  const { data, error } = await db().rpc("artists_for_user", { p_user_id: userId });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => toArtist(r as Record<string, unknown>));
}

export async function createArtistProfile(input: {
  slug: string;
  displayName: string;
  bio?: string;
  genres?: string[];
  dropIds: string[];
}): Promise<{ artist: ArtistProfile | null; error?: string }> {
  const { data, error } = await db().rpc("create_artist_profile", {
    p_slug: input.slug,
    p_display_name: input.displayName,
    p_bio: input.bio ?? null,
    p_genres: input.genres ?? [],
    p_drop_ids: input.dropIds,
  });
  if (error) {
    const msg = error.message || "Couldn't create artist profile";
    if (/need_two_tagged_drops/i.test(msg)) {
      return { artist: null, error: "Tag at least 2 of your drops with this artist name first." };
    }
    if (/slug taken/i.test(msg)) return { artist: null, error: "That slug is taken." };
    if (/invalid slug/i.test(msg)) return { artist: null, error: "Use a short URL slug (letters, numbers, hyphens)." };
    return { artist: null, error: msg };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { artist: row ? toArtist(row as Record<string, unknown>) : null };
}

/** Member-owned patch for official artist visuals (RLS: artist_profiles update members). */
export async function updateArtistProfile(
  artistId: string,
  patch: { coverUrl?: string | null; avatarUrl?: string | null; bio?: string | null },
): Promise<boolean> {
  const row: Record<string, unknown> = {};
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (Object.keys(row).length === 0) return true;
  const { error } = await db().from("artist_profiles").update(row).eq("id", artistId);
  return !error;
}

export async function dropsForArtist(artistId: string, limit = 40): Promise<Drop[]> {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id,album,release_type")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return assembleDrops(data ?? [], myId);
}

export async function artistMembers(artistId: string): Promise<{ userId: string; role: string; username: string | null }[]> {
  const { data } = await db().from("artist_members")
    .select("user_id, role")
    .eq("artist_id", artistId);
  if (!data?.length) return [];
  const names = await usernamesFor(data.map((r: { user_id: string }) => r.user_id));
  return data.map((r: { user_id: string; role: string }) => ({
    userId: r.user_id,
    role: r.role,
    username: names.get(r.user_id) ?? null,
  }));
}

export async function updateDropCreditedArtist(dropId: string, creditedArtist: string | null): Promise<boolean> {
  const { error } = await db().from("drops")
    .update({ credited_artist: creditedArtist?.trim() || null })
    .eq("id", dropId);
  return !error;
}

// ── Discovery (anti-popularity feed) ─────────────────────────────────────────
export interface DiscoveryDrop extends Drop { visibility: number; popularity: number; plays: number; myReaction?: Reaction; myRating?: number }

const _played = new Set<string>();
/** Count a distinct-listener play (once per drop per session; server de-dupes + ignores self-plays). */
export async function recordPlay(dropId: string) {
  if (!dropId || _played.has(dropId)) return;
  _played.add(dropId);
  try { await db().rpc("record_play", { p_drop: dropId }); } catch { /* non-fatal */ }
}

/**
 * The anti-popularity discovery feed: under-exposed artists first, overexposed last.
 * `seed` rotates the fair-exposure jitter (pass a fresh value to reshuffle unknowns).
 */
export async function listDiscovery(seed: number, limit = 40): Promise<DiscoveryDrop[]> {
  const myId = await currentUserId();
  const { data } = await db().rpc("discovery_feed", { p_limit: limit, p_seed: Math.floor(seed) & 0x7fffffff });
  if (!data) return [];
  const drops = await assembleDrops(data, myId);
  const meta = new Map<string, { visibility: number; popularity: number; plays: number }>();
  (data as any[]).forEach((r) => meta.set(r.id, { visibility: Number(r.visibility ?? 0), popularity: Number(r.popularity ?? 0), plays: Number(r.plays ?? 0) }));
  return drops.map((d) => ({ ...d, ...(meta.get(d.id) ?? { visibility: 0, popularity: 0, plays: 0 }) })) as DiscoveryDrop[];
}

/** Personalized For You radio — genre affinity + freshness + unheard bias. */
export async function listForYouDrops(limit = 24): Promise<Drop[]> {
  const myId = await currentUserId();
  const { data, error } = await db().rpc("for_you_drops", { p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return assembleDrops(rows, myId);
}

export async function react(dropId: string, reaction: Reaction) {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("reactions").upsert({ drop_id: dropId, user_id: uid, reaction });
  void awardSocialVc("drop_react", "drop", dropId).catch(() => undefined);
}
export async function rateTrack(dropId: string, stars: number) {
  await db().rpc("rate_track", { p_drop: dropId, p_rating: stars });
  void awardSocialVc("track_feedback", "drop", dropId).catch(() => undefined);
}

/** Written feedback on a drop — awards track_feedback_note when accepted server-side. */
export async function submitDropFeedback(
  dropId: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await db().rpc("submit_drop_feedback", {
    p_drop: dropId,
    p_note: note,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok?: boolean; error?: string } | null;
  if (!r?.ok) return { ok: false, error: r?.error || "rejected" };
  void awardSocialVc("track_feedback_note", "drop", dropId).catch(() => undefined);
  return { ok: true };
}

export interface TasteMatch {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  fit: number;
  sharedPlays: number;
  sharedGenres: string[];
}

export async function tasteMatches(limit = 30): Promise<TasteMatch[]> {
  const { data, error } = await db().rpc("taste_matches", { p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    userId: r.user_id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    fit: Number(r.fit ?? 0),
    sharedPlays: Number(r.shared_plays ?? 0),
    sharedGenres: Array.isArray(r.shared_genres) ? r.shared_genres.map(String) : [],
  }));
}

export interface WaveComment {
  id: string;
  dropId: string;
  userId: string;
  body: string;
  timeSec: number;
  createdAt: number;
  username: string | null;
  avatarUrl: string | null;
}

export async function listWaveComments(dropId: string, limit = 80): Promise<WaveComment[]> {
  const { data, error } = await db().rpc("list_wave_comments", { p_drop: dropId, p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    id: r.id,
    dropId: r.drop_id,
    userId: r.user_id,
    body: r.body ?? "",
    timeSec: Number(r.time_sec ?? 0),
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    username: r.username ?? null,
    avatarUrl: r.avatar_url ?? null,
  }));
}

export async function addWaveComment(
  dropId: string,
  body: string,
  timeSec: number,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data, error } = await db().rpc("add_wave_comment", {
    p_drop: dropId,
    p_body: body,
    p_time: timeSec,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok?: boolean; error?: string; id?: string } | null;
  if (!r?.ok) return { ok: false, error: r?.error || "rejected" };
  return { ok: true, id: r.id };
}

/**
 * Request a full-quality download of an asset (§8). The definer RPC enforces the
 * permission + license gate and records the grant (the license chain); we then
 * mint a short-lived signed URL with a download disposition. Returns null when
 * not permitted (e.g. an owner-only project bundle).
 */
export interface DownloadResult { url: string; watermarked: boolean; revoke: boolean }
export async function downloadAsset(assetId: string): Promise<DownloadResult | null> {
  // Preferred: per-recipient forensic watermark on delivery. Direct fetch (not
  // functions.invoke) so the binary WAV response is read reliably as a Blob.
  try {
    const { data: { session } } = await db().auth.getSession();
    if (session?.access_token) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/watermark`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetId }),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("audio")) {
          const blob = await res.blob();
          return { url: URL.createObjectURL(blob), watermarked: true, revoke: true };
        }
        const j = await res.json().catch(() => ({}));
        if (j.url) return { url: j.url, watermarked: false, revoke: false };
      }
    }
  } catch { /* fall back to the plain gate */ }
  // Fallback: permission-checked signed URL (still recorded in the license chain).
  const { data: path, error } = await db().rpc("request_asset_download", { p_asset: assetId });
  if (error || !path) return null;
  if (/^(https?:|data:|blob:)/i.test(path as string)) return { url: path as string, watermarked: false, revoke: false };
  if (isSecurePath(path as string)) {
    const u = (await bunnySign([path as string])).get(path as string);
    return u ? { url: u, watermarked: false, revoke: false } : null;
  }
  // Last resort, reached only when the watermark function is unreachable. Once
  // storage read is locked to the owner (migration 0096) this can sign your own
  // files only; the watermark function stays the download authority for everyone
  // else, so a non-owner gets no download rather than an unauthorised one.
  const { data } = await db().storage.from(AUDIO_BUCKET).createSignedUrl(path as string, SIGN_TTL, { download: true });
  return data?.signedUrl ? { url: data.signedUrl, watermarked: false, revoke: false } : null;
}

export interface AssetProvenance {
  firstSeen: number | null;
  sha256: string | null;
  downloads: number;
  watermarks: number;
  licenseEvents: number;
}

/** Public provenance summary — first-seen + aggregate chain counts (no PII). */
export async function assetProvenance(assetId: string): Promise<AssetProvenance | null> {
  const { data, error } = await db().rpc("asset_provenance", { p_asset: assetId });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    firstSeen: row.first_seen ? new Date(row.first_seen).getTime() : null,
    sha256: (row.sha256 as string | null) ?? null,
    downloads: Number(row.downloads ?? 0),
    watermarks: Number(row.watermarks ?? 0),
    licenseEvents: Number(row.license_events ?? 0),
  };
}

// ── Connections + DMs ────────────────────────────────────────────────────────
/**
 * Send a connection request. This is a *request* the peer must accept — it is not
 * a unidirectional follow, so callers must not report it as one.
 */
export async function connect(peerId: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid || uid === peerId) return false;
  const { error } = await db()
    .from("connections")
    .upsert({ requester_id: uid, addressee_id: peerId, status: "pending" });
  return !error;
}

/** Accept or decline an incoming connection request (addressee only). */
export async function respondConnection(requesterId: string, accept: boolean): Promise<boolean> {
  const { data, error } = await db().rpc("respond_connection", {
    p_requester: requesterId,
    p_accept: accept,
  });
  if (error) return false;
  if (data && accept) {
    void awardSocialVc("connection_accept", "connection", requesterId).catch(() => undefined);
  }
  return !!data;
}

/** Persist collaborator connection outcomes for future LTR tuning. */
export async function logMatchFeedback(
  peerId: string,
  outcome: "accepted" | "declined" | "pass" | "connect",
  source: "connection" | "connect_page" = "connect_page",
): Promise<void> {
  await db().rpc("log_match_feedback", {
    p_peer: peerId,
    p_outcome: outcome,
    p_source: source,
  });
}
export async function startDm(peerId: string): Promise<string | null> {
  const { data, error } = await db().rpc("start_dm", { p_peer: peerId });
  if (error) return null;
  return (data as string) ?? null;
}
export async function listThreads(): Promise<DmThread[]> {
  return listInboxThreads();
}

export async function listInboxThreads(limit = 40): Promise<DmThread[]> {
  const { data, error } = await db().rpc("list_inbox_threads", { p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((t) => ({
    id: t.thread_id,
    peerId: t.peer_id,
    peerUsername: t.peer_username ?? null,
    peerAvatarUrl: t.peer_avatar ?? null,
    lastAt: t.last_at ? new Date(t.last_at).getTime() : Date.now(),
    lastBody: t.last_body ?? "",
    unread: !!t.unread,
  }));
}
export async function getThreadPeer(threadId: string): Promise<{ id: string; username: string | null } | null> {
  const uid = await currentUserId();
  const { data: t } = await db().from("dm_threads").select("user_a,user_b").eq("id", threadId).maybeSingle();
  if (!t) return null;
  const row = t as { user_a: string; user_b: string };
  const peerId = row.user_a === uid ? row.user_b : row.user_a;
  const { data } = await db().from("public_profiles").select("username").eq("id", peerId).maybeSingle();
  return { id: peerId, username: (data as { username?: string } | null)?.username ?? null };
}

export async function listMessages(threadId: string): Promise<DmMessage[]> {
  const uid = await currentUserId();
  const { data } = await db().from("dm_messages")
    .select("id,thread_id,sender_id,body,kind,media_url,created_at,deleted_for_all,deleted_for")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data ?? [])
    .filter((m: any) => {
      if (m.deleted_for_all) return false;
      const del = m.deleted_for;
      if (Array.isArray(del) && uid && del.includes(uid)) return false;
      return true;
    })
    .map((m: any) => ({
      id: m.id, threadId: m.thread_id, senderId: m.sender_id,
      body: m.body ?? "",
      kind: (m.kind ?? "text") as DmMessage["kind"],
      mediaUrl: m.media_url ?? null,
      createdAt: new Date(m.created_at).getTime(), mine: m.sender_id === uid,
    }));
}
export async function sendMessage(
  threadId: string,
  body: string,
  opts?: { kind?: DmMessage["kind"]; mediaUrl?: string | null },
) {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("dm_messages").insert({
    thread_id: threadId,
    sender_id: uid,
    body: body || "",
    kind: opts?.kind ?? "text",
    media_url: opts?.mediaUrl ?? null,
  });
  // last_at is maintained by the dm_messages_touch_thread trigger. dm_threads is
  // RLS SELECT-only, so a client update here silently matched zero rows.
  const event = opts?.kind === "video" ? "video_message" : "dm_send";
  void awardSocialVc(event, "dm", threadId).catch(() => undefined);
}

export async function markThreadRead(threadId: string) {
  await db().rpc("mark_thread_read", { p_thread: threadId });
}

export async function deleteDmMessage(messageId: string) {
  await db().rpc("delete_dm_message", { p_id: messageId });
}

export async function hideDmThread(threadId: string) {
  await db().rpc("hide_dm_thread", { p_thread: threadId });
}

export async function blockUser(peerId: string) {
  await db().rpc("block_user", { p_peer: peerId });
}

export async function unblockUser(peerId: string) {
  await db().rpc("unblock_user", { p_peer: peerId });
}

export async function uploadChatMedia(file: Blob, ext: string): Promise<string | null> {
  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/bunny-upload?kind=project&name=${encodeURIComponent(`chat.${ext}`)}`;
    const { data: sess } = await db().auth.getSession();
    const token = sess.session?.access_token;
    if (!token || !SUPABASE_ANON_KEY) return null;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) return null;
    const json = await res.json() as { url?: string };
    return json.url ?? null;
  } catch {
    return null;
  }
}

// ── Notifications / Live Feed ─────────────────────────────────────────────────
export async function listNotifications(): Promise<AppNotification[]> {
  return listLiveFeed();
}

export async function listLiveFeed(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await db().rpc("list_live_feed", { p_limit: limit });
  if (error || !data) {
    const { data: fallback } = await db().from("notifications")
      .select("id,kind,actor_id,title,body,ref_id,read,created_at,payload")
      .order("created_at", { ascending: false }).limit(limit);
    return (fallback ?? []).map(mapNotification);
  }
  return (data as any[]).map(mapNotification);
}

function mapNotification(n: any): AppNotification {
  return {
    id: n.id, kind: n.kind, actorId: n.actor_id ?? null, title: n.title,
    body: n.body ?? null, refId: n.ref_id ?? null, read: !!n.read,
    createdAt: new Date(n.created_at).getTime(),
    payload: (n.payload ?? {}) as Record<string, unknown>,
  };
}
export async function unreadNotificationCount(): Promise<number> {
  const { count } = await db().from("notifications")
    .select("id", { count: "exact", head: true }).eq("read", false);
  return count ?? 0;
}
export async function markNotificationsRead() {
  await db().rpc("mark_notifications_read");
}

/** Explicit ack for a single must-ack notification (video watched / request handled). */
export async function markNotificationRead(id: string) {
  await db().from("notifications").update({ read: true }).eq("id", id);
}

/** Expire pending connect requests older than 3 days; notifies senders with reconnect nudge. */
export async function expireStaleConnections(): Promise<number> {
  const { data, error } = await db().rpc("expire_stale_connection_requests");
  if (error) return 0;
  return Number(data ?? 0);
}

// ── Search / discovery ────────────────────────────────────────────────────────
export interface CreatorFilters {
  role?: string; genre?: string; daw?: string; plugin?: string;
  key?: string; bpm?: number | null; location?: string; remote?: boolean | null;
  profession?: string;
  software?: string; styles?: string; engines?: string;
}
export async function searchCreators(query?: string, f: CreatorFilters = {}): Promise<CreatorSearchResult[]> {
  const { data } = await db().rpc("search_creators", {
    p_query: query || null, p_role: f.role || null, p_genre: f.genre || null,
    p_daw: f.daw || null, p_plugin: f.plugin || null, p_key: f.key || null,
    p_bpm: f.bpm ?? null, p_location: f.location || null, p_remote: f.remote ?? null,
    p_profession: f.profession || null,
    p_software: f.software || null, p_styles: f.styles || null, p_engines: f.engines || null,
    p_limit: 40,
  });
  return (data ?? []).map((r: any) => ({
    userId: r.user_id, username: r.username ?? null, location: r.location ?? null,
    offers: r.offers ?? [], seeks: r.seeks ?? [], genres: r.genres ?? [],
    profession: r.profession ?? null,
  }));
}

// ── Studio (Phase D: private collab rooms → versions → splits → credits) ─────

export async function myProjects(): Promise<import("@/types").ProjectSummary[]> {
  const { data } = await db().rpc("my_projects");
  return (data ?? []).map((r: any) => ({
    id: r.id, title: r.title, status: r.status, ownerId: r.owner_id,
    isOwner: !!r.is_owner, members: Number(r.members ?? 0), versions: Number(r.versions ?? 0),
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    myAgreed: !!r.my_agreed,
    pendingAgrees: Number(r.pending_agrees ?? 0),
    repoKind: (r.repo_kind as "collab" | "repo") ?? "collab",
    daw: r.daw ?? null,
    visibility: (r.visibility as "private" | "collab" | "listed") ?? "private",
    commitCount: Number(r.commit_count ?? 0),
  }));
}

/** Recent Studio release batches (bulk uploads) owned by the caller. */
export async function myReleaseBatches(limit = 8): Promise<import("@/types").ReleaseBatchSummary[]> {
  const { data } = await db()
    .from("release_batches")
    .select("id,title,credited_artist,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title ?? null,
    creditedArtist: r.credited_artist ?? null,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  }));
}

export async function createProject(input: {
  title: string; description?: string; bpm?: number; musicalKey?: string; genres?: string[];
}): Promise<string | null> {
  const { data, error } = await db().rpc("create_project", {
    p_title: input.title, p_description: input.description ?? null,
    p_bpm: input.bpm ?? null, p_key: input.musicalKey ?? null, p_genres: input.genres ?? [],
  });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function projectDetail(id: string): Promise<import("@/types").ProjectDetail | null> {
  const { data, error } = await db().rpc("project_detail", { p_project: id });
  if (error || !data) return null;
  const p = data.project ?? {};
  const tip = data.tip;
  return {
    id: p.id, title: p.title, description: p.description ?? null,
    bpm: p.bpm ?? null, musicalKey: p.musical_key ?? null, genres: p.genres ?? [],
    status: p.status, ownerId: p.owner_id, isOwner: !!data.is_owner,
    releasedAt: p.released_at ? new Date(p.released_at).getTime() : null,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    collaborators: (data.collaborators ?? []).map((c: any) => ({
      userId: c.user_id, username: c.username ?? null, role: c.role ?? null,
      canUpload: !!c.can_upload, split: Number(c.split ?? 0), agreed: !!c.agreed,
    })),
    versions: (data.versions ?? []).map((v: any) => ({
      id: v.id, version: v.version, note: v.note ?? null, uploader: v.uploader ?? null,
      assetId: v.asset_id ?? null, kind: v.kind ?? null, format: v.format ?? null,
      createdAt: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
    })),
    repoKind: (p.repo_kind as "collab" | "repo") ?? "collab",
    daw: p.daw ?? null,
    visibility: (p.visibility as "private" | "collab" | "listed") ?? "private",
    defaultBranch: p.default_branch ?? "main",
    license: p.license ?? "collab-only",
    branches: (data.branches ?? []).map((b: any) => ({
      name: b.name,
      commitId: b.commit_id,
      updatedAt: b.updated_at ? new Date(b.updated_at).getTime() : Date.now(),
    })),
    tip: tip ? {
      id: tip.commit_id,
      message: tip.message ?? "",
      createdAt: tip.created_at ? new Date(tip.created_at).getTime() : Date.now(),
      author: tip.author ?? null,
      fileCount: Number(tip.file_count ?? 0),
      totalBytes: Number(tip.total_bytes ?? 0),
    } : null,
  };
}

export async function addCollaborator(projectId: string, userId: string, roleId?: string) {
  const { error } = await db().rpc("add_collaborator", { p_project: projectId, p_user: userId, p_role: roleId ?? null });
  if (error) throw error;
}
export async function setSplit(projectId: string, userId: string, split: number, roleId?: string) {
  const { error } = await db().rpc("set_split", { p_project: projectId, p_user: userId, p_role: roleId ?? null, p_split: split });
  if (error) throw error;
}
export async function agreeSplit(projectId: string) {
  const { error } = await db().rpc("agree_split", { p_project: projectId });
  if (error) throw error;
}
export async function releaseProject(projectId: string) {
  const { error } = await db().rpc("release_project", { p_project: projectId });
  if (error) throw error;
}

/**
 * Upload a Studio collab bundle to Bunny's token-authed secure zone
 * (`kind=project`), register an asset, and attach it as a new version.
 * Legacy Supabase `project-files` paths remain readable via signAudio fallbacks.
 */
export async function addVersion(projectId: string, file: Blob, filename: string, note?: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) return false;
  const ext = (filename.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const ct = (file as File).type || "application/octet-stream";
  const up = await fetch(
    `${SUPABASE_URL}/functions/v1/bunny-upload?kind=project&name=${encodeURIComponent(filename || `a.${ext}`)}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${sess.access_token}`, apikey: SUPABASE_ANON_KEY, "content-type": ct },
      body: file,
    },
  );
  if (!up.ok) return false;
  const j = await up.json().catch(() => null);
  const path = (j?.path as string) ?? null;
  if (!path) return false;
  const { data: asset, error: aErr } = await db().from("assets").insert({
    owner_id: uid, kind: "project", title: filename, url: path, format: ext, license: "collab-only",
  }).select("id").single();
  if (aErr || !asset) return false;
  const { error } = await db().rpc("add_version", { p_project: projectId, p_asset: (asset as any).id, p_note: note ?? null });
  return !error;
}

// ── Music Repos (Phase N) ────────────────────────────────────────────────────

export async function createRepo(input: {
  title: string;
  description?: string;
  daw?: string;
  visibility?: "private" | "collab" | "listed";
  license?: string;
  bpm?: number;
  musicalKey?: string;
  genres?: string[];
}): Promise<string | null> {
  const { data, error } = await db().rpc("create_repo", {
    p_title: input.title,
    p_description: input.description ?? null,
    p_daw: input.daw ?? null,
    p_visibility: input.visibility ?? "private",
    p_license: input.license ?? "collab-only",
    p_bpm: input.bpm ?? null,
    p_key: input.musicalKey ?? null,
    p_genres: input.genres ?? [],
  });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function repoBlobExists(hashes: string[]): Promise<Set<string>> {
  if (!hashes.length) return new Set();
  const { data } = await db().rpc("repo_blob_exists", { p_hashes: hashes });
  return new Set((data as string[] | null) ?? []);
}

export async function uploadRepoBlob(
  file: Blob,
  filename: string,
  hash: string,
  onProgress?: (pct: number) => void,
): Promise<string | null> {
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) return null;
  const ext = (filename.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const ct = (file as File).type || "application/octet-stream";
  const endpoint =
    `${SUPABASE_URL}/functions/v1/bunny-upload?kind=repo-blob` +
    `&hash=${encodeURIComponent(hash)}&name=${encodeURIComponent(filename || `a.${ext}`)}`;

  return await new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${sess.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("content-type", ct);
    xhr.setRequestHeader("x-content-hash", hash);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        resolve(null);
        return;
      }
      try {
        const j = JSON.parse(xhr.responseText);
        resolve((j?.path as string) ?? null);
      } catch {
        resolve(null);
      }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(file);
  });
}

export async function registerRepoBlob(
  hash: string,
  size: number,
  bunnyPath: string,
  mime?: string,
): Promise<boolean> {
  const { data, error } = await db().rpc("repo_register_blob", {
    p_hash: hash,
    p_size: size,
    p_bunny_path: bunnyPath,
    p_mime: mime ?? null,
  });
  return !error && !!data;
}

export async function commitRepo(input: {
  projectId: string;
  branch?: string;
  message: string;
  entries: { path: string; hash: string; size: number; mode?: string }[];
  parentId?: string | null;
  bounceAssetId?: string | null;
  plugins?: unknown[];
  meta?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await db().rpc("repo_commit", {
    p_project: input.projectId,
    p_branch: input.branch ?? "main",
    p_message: input.message,
    p_entries: input.entries.map((e) => ({
      path: e.path,
      hash: e.hash,
      size: e.size,
      mode: e.mode ?? "blob",
    })),
    p_parent: input.parentId ?? null,
    p_bounce_asset: input.bounceAssetId ?? null,
    p_plugins: input.plugins ?? [],
    p_meta: input.meta ?? {},
  });
  if (error) throw error;
  void recordSocialScoreEvent("repo_commit", { projectId: input.projectId }).catch(() => undefined);
  return (data as string) ?? null;
}

/**
 * Full folder → CAS upload → commit pipeline.
 */
export async function syncRepoFolder(opts: {
  projectId: string;
  entries: import("@/lib/repoSync").RepoFileEntry[];
  message: string;
  branch?: string;
  daw?: string;
  onProgress?: (phase: string, detail: string, pct?: number) => void;
}): Promise<string | null> {
  const { projectId, entries, message, branch = "main" } = opts;
  if (!entries.length) return null;

  opts.onProgress?.("dedupe", "Checking existing blobs…");
  const hashes = [...new Set(entries.map((e) => e.hash))];
  const existing = await repoBlobExists(hashes);
  const missing = entries.filter((e) => !existing.has(e.hash));
  // Unique missing by hash
  const byHash = new Map<string, typeof entries[0]>();
  for (const e of missing) {
    if (!byHash.has(e.hash)) byHash.set(e.hash, e);
  }
  const toUpload = [...byHash.values()];

  let i = 0;
  for (const e of toUpload) {
    i += 1;
    opts.onProgress?.(
      "upload",
      `Uploading ${e.path} (${i}/${toUpload.length})`,
      Math.round((i / Math.max(1, toUpload.length)) * 100),
    );
    const path = await uploadRepoBlob(e.file, e.path.split("/").pop() || e.path, e.hash);
    if (!path) throw new Error(`Upload failed: ${e.path}`);
    const ok = await registerRepoBlob(e.hash, e.size, path, e.mime);
    if (!ok) throw new Error(`Register failed: ${e.path}`);
  }

  // Ensure all entries are registered (deduped ones too — register is idempotent)
  for (const e of entries) {
    if (existing.has(e.hash)) continue;
    // already registered in upload loop
  }
  // Re-register existing hashes that might only exist remotely from another repo — blob table is global
  for (const e of entries) {
    if (!existing.has(e.hash)) continue;
    // nothing — already in CAS
  }

  opts.onProgress?.("commit", "Creating commit…");
  const paths = entries.map((e) => e.path);
  const pack = analyzeRepoPack(paths, opts.daw as RepoDawHint | undefined);
  const commitId = await commitRepo({
    projectId,
    branch,
    message,
    entries: entries.map((e) => ({ path: e.path, hash: e.hash, size: e.size })),
    meta: {
      daw: opts.daw ?? null,
      file_count: entries.length,
      has_dawproject: pack.hasDawproject,
      has_stem_pack: pack.hasStemPack,
      has_bounce: pack.hasBounce,
      stem_count: pack.stemPaths.length,
      bounce_count: pack.bouncePaths.length,
      dawproject_paths: pack.dawprojectPaths.slice(0, 20),
    },
  });
  return commitId;
}

export async function repoHistory(
  projectId: string,
  branch = "main",
  limit = 40,
): Promise<import("@/types").RepoCommitSummary[]> {
  const { data, error } = await db().rpc("repo_history", {
    p_project: projectId,
    p_branch: branch,
    p_limit: limit,
  });
  if (error || !data) return [];
  return (data as any[]).map((c) => ({
    id: c.id,
    message: c.message ?? "",
    createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
    author: c.author ?? null,
    treeHash: c.tree_hash,
    parentId: c.parent_id ?? null,
    bounceAssetId: c.bounce_asset_id ?? null,
    fileCount: Number(c.file_count ?? 0),
    totalBytes: Number(c.total_bytes ?? 0),
    plugins: c.plugins,
    meta: c.meta,
  }));
}

export async function repoTreeAt(
  projectId: string,
  commitId?: string | null,
  branch = "main",
): Promise<import("@/types").RepoTreeView | null> {
  const { data, error } = await db().rpc("repo_tree_at", {
    p_project: projectId,
    p_commit: commitId ?? null,
    p_branch: branch,
  });
  if (error || !data) return null;
  return {
    commitId: data.commit_id ?? null,
    treeHash: data.tree_hash,
    fileCount: Number(data.file_count ?? 0),
    totalBytes: Number(data.total_bytes ?? 0),
    entries: (data.entries ?? []).map((e: any) => ({
      path: e.path,
      hash: e.hash,
      size: Number(e.size ?? 0),
      mode: e.mode,
    })),
  };
}

export async function upsertRepoListing(
  projectId: string,
  priceCredits: number,
  grantKind: "download" | "fork" | "collab_invite" = "download",
  active = true,
): Promise<boolean> {
  const { data, error } = await db().rpc("repo_upsert_listing", {
    p_project: projectId,
    p_price: priceCredits,
    p_grant: grantKind,
    p_active: active,
  });
  return !error && !!data;
}

export async function purchaseRepo(projectId: string): Promise<string | null> {
  const { data, error } = await db().rpc("repo_purchase", { p_project: projectId });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function createRepoBranch(
  projectId: string,
  name: string,
  fromBranch = "main",
): Promise<boolean> {
  const { data, error } = await db().rpc("repo_create_branch", {
    p_project: projectId,
    p_name: name,
    p_from_branch: fromBranch,
  });
  return !error && !!data;
}

export async function openRepoMr(input: {
  projectId: string;
  title: string;
  source: string;
  target?: string;
  body?: string;
}): Promise<string | null> {
  const { data, error } = await db().rpc("repo_open_mr", {
    p_project: input.projectId,
    p_title: input.title,
    p_source: input.source,
    p_target: input.target ?? "main",
    p_body: input.body ?? null,
  });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function listRepoMrs(
  projectId: string,
  status?: string | null,
): Promise<import("@/types").RepoMergeRequest[]> {
  const { data, error } = await db().rpc("repo_list_mrs", {
    p_project: projectId,
    p_status: status ?? null,
  });
  if (error || !data) return [];
  return (data as any[]).map((m) => ({
    id: m.id,
    title: m.title,
    body: m.body ?? null,
    status: m.status,
    sourceBranch: m.source_branch,
    targetBranch: m.target_branch,
    headCommitId: m.head_commit_id ?? null,
    authorId: m.author_id,
    author: m.author ?? null,
    createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
    closedAt: m.closed_at ? new Date(m.closed_at).getTime() : null,
  }));
}

export async function mergeRepoMr(
  mrId: string,
  strategy: "theirs" | "ours" = "theirs",
): Promise<boolean> {
  const { data, error } = await db().rpc("repo_merge_mr", {
    p_mr: mrId,
    p_strategy: strategy,
  });
  return !error && !!data;
}

export async function closeRepoMr(mrId: string): Promise<boolean> {
  const { data, error } = await db().rpc("repo_close_mr", { p_mr: mrId });
  return !error && !!data;
}

export async function repoTipManifest(
  projectId: string,
  branch = "main",
): Promise<import("@/types").RepoTipManifest | null> {
  const { data, error } = await db().rpc("repo_tip_manifest", {
    p_project: projectId,
    p_branch: branch,
  });
  if (error || !data) return null;
  return {
    commitId: data.commit_id ?? null,
    branch: data.branch ?? branch,
    treeHash: data.tree_hash,
    fileCount: Number(data.file_count ?? 0),
    totalBytes: Number(data.total_bytes ?? 0),
    files: (data.files ?? []).map((f: any) => ({
      path: f.path,
      hash: f.hash,
      size: Number(f.size ?? 0),
      bunnyPath: f.bunny_path,
      mime: f.mime ?? null,
    })),
  };
}

/** Sign tip blob paths for download (pull). */
export async function pullRepoTipUrls(
  projectId: string,
  branch = "main",
): Promise<{ path: string; url: string; size: number }[]> {
  const tip = await repoTipManifest(projectId, branch);
  if (!tip?.files?.length) return [];
  const paths = tip.files.map((f) => f.bunnyPath).filter(Boolean);
  const signed = await bunnySign(paths);
  return tip.files
    .map((f) => {
      const url = signed.get(f.bunnyPath);
      return url ? { path: f.path, url, size: f.size } : null;
    })
    .filter((x): x is { path: string; url: string; size: number } => !!x);
}

export async function getRepoListing(
  projectId: string,
): Promise<import("@/types").RepoListing | null> {
  const { data, error } = await db().rpc("repo_get_listing", { p_project: projectId });
  if (error || !data) return null;
  return {
    projectId: data.project_id,
    priceCredits: Number(data.price_credits ?? 0),
    grantKind: data.grant_kind,
    active: !!data.active,
    sales: Number(data.sales ?? 0),
    title: data.title ?? null,
    ownerId: data.owner_id,
    daw: data.daw ?? null,
    license: data.license ?? null,
  };
}

export async function listedReposFeed(limit = 24): Promise<import("@/types").RepoListingCard[]> {
  const { data, error } = await db().rpc("repo_listed_feed", { p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    projectId: r.project_id,
    title: r.title,
    daw: r.daw ?? null,
    license: r.license ?? null,
    priceCredits: Number(r.price_credits ?? 0),
    grantKind: r.grant_kind,
    sales: Number(r.sales ?? 0),
    owner: r.owner ?? null,
    ownerId: r.owner_id,
  }));
}

export async function creatorCredits(id: string): Promise<import("@/types").Credit[]> {
  const { data } = await db().rpc("creator_credits", { p_id: id });
  return (data ?? []).map((r: any) => ({
    projectId: r.project_id, title: r.title, role: r.role ?? null,
    releasedAt: r.released_at ? new Date(r.released_at).getTime() : null,
    split: r.split != null ? Number(r.split) : null,
  }));
}

/** Rate a collaborator on a released Studio project (§5.4f). */
export async function rateCollaborator(projectId: string, rateeId: string, rating: number): Promise<void> {
  const { error } = await db().rpc("rate_collaborator", {
    p_project: projectId, p_ratee: rateeId, p_rating: rating,
  });
  if (error) throw error;
}

/** Ratings the caller has given on a project (ratee_id → 1–5). */
export async function projectCollabRatings(projectId: string): Promise<Record<string, number>> {
  const { data } = await db().rpc("project_collab_ratings", { p_project: projectId });
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.ratee_id] = Number(r.rating);
  return out;
}

// ── Collab room chat (Phase D) ───────────────────────────────────────────────
export interface ProjectMessage {
  id: string;
  senderId: string;
  username: string | null;
  body: string;
  createdAt: number;
  mine: boolean;
}

export async function listProjectMessages(projectId: string, limit = 80): Promise<ProjectMessage[]> {
  const uid = await currentUserId();
  const { data, error } = await db().rpc("list_project_messages", { p_project: projectId, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    username: r.username ?? null,
    body: r.body,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    mine: !!uid && r.sender_id === uid,
  }));
}

export async function sendProjectMessage(projectId: string, body: string): Promise<void> {
  const { error } = await db().rpc("send_project_message", { p_project: projectId, p_body: body });
  if (error) throw error;
}

// ── Rooms (Phase F: categorized collab chat + presence) ─────────────────────
export async function listRooms(): Promise<import("@/types").Room[]> {
  const { data } = await db().rpc("list_rooms");
  return (data ?? []).map((r: any) => ({
    id: r.id, kind: r.kind, refId: r.ref_id, title: r.title,
    messages: Number(r.messages ?? 0), lastAt: r.last_at ? new Date(r.last_at).getTime() : null,
    accessTier: (r.access_tier as "free" | "premium") ?? "free",
    vcPrice: r.vc_price != null ? Number(r.vc_price) : null,
    billingPeriod: r.billing_period ?? null,
    ownerId: r.owner_id ?? null,
    voiceEnabled: !!r.voice_enabled,
    perks: (r.perks ?? {}) as Record<string, unknown>,
  }));
}

export async function topLiveSessions(limit = 3): Promise<import("@/types").LiveSessionCard[]> {
  const { data, error } = await db().rpc("top_live_sessions", { p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    id: r.id,
    hostId: r.host_id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    roleLabel: r.role_label ?? null,
    title: r.title ?? null,
    source: resolveLiveSource(r.source, r.monetization as Record<string, unknown> | null),
    intent: r.intent ?? null,
    viewerCount: Number(r.viewer_count ?? 0),
    playbackHls: r.playback_hls ?? null,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : Date.now(),
    visibility: (r.visibility === "circle" ? "circle" : "world") as import("@/types").LiveAudience,
  }));
}

export async function listSocialRooms(limit = 40): Promise<import("@/types").SocialRoomCard[]> {
  const { data, error } = await db().rpc("list_social_rooms", { p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    accessTier: (r.access_tier as "free" | "premium") ?? "free",
    vcPrice: r.vc_price != null ? Number(r.vc_price) : null,
    billingPeriod: r.billing_period ?? null,
    perks: (r.perks ?? {}) as Record<string, unknown>,
    voiceEnabled: !!r.voice_enabled,
    ownerId: r.owner_id ?? null,
    ownerUsername: r.owner_username ?? null,
    members: Number(r.members ?? 0),
    canAccess: !!r.can_access,
  }));
}

export async function createSocialRoom(input: {
  title: string;
  description?: string;
  accessTier?: "free" | "premium";
  vcPrice?: number;
  billingPeriod?: "week" | "month";
  voiceEnabled?: boolean;
  perks?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await db().rpc("create_social_room", {
    p_title: input.title,
    p_description: input.description ?? null,
    p_access_tier: input.accessTier ?? "free",
    p_vc_price: input.vcPrice ?? null,
    p_billing_period: input.billingPeriod ?? null,
    p_perks: input.perks ?? {},
    p_voice_enabled: input.voiceEnabled ?? false,
  });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function subscribeRoomVc(roomId: string): Promise<string | null> {
  const { data, error } = await db().rpc("subscribe_room_vc", { p_room: roomId });
  if (error) throw error;
  return (data as string) ?? null;
}

export async function cancelRoomSubscription(roomId: string): Promise<boolean> {
  const { data, error } = await db().rpc("cancel_room_subscription", { p_room: roomId });
  return !error && !!data;
}

export async function getRoom(id: string): Promise<import("@/types").Room | null> {
  const uid = await currentUserId();
  const { data } = await db()
    .from("rooms")
    .select("id,kind,ref_id,title,access_tier,vc_price,billing_period,owner_id,voice_enabled,livekit_room,perks")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as any;
  let canAccess = true;
  if (r.kind === "social" || r.access_tier === "premium") {
    const { data: ok } = await db().rpc("can_access_room", { p_room: id, p_uid: uid });
    canAccess = !!ok;
  }
  return {
    id: r.id,
    kind: r.kind,
    refId: r.ref_id ?? "",
    title: r.title,
    messages: 0,
    lastAt: null,
    accessTier: (r.access_tier as "free" | "premium") ?? "free",
    vcPrice: r.vc_price != null ? Number(r.vc_price) : null,
    billingPeriod: r.billing_period ?? null,
    ownerId: r.owner_id ?? null,
    voiceEnabled: !!r.voice_enabled,
    livekitRoom: r.livekit_room ?? null,
    perks: (r.perks ?? {}) as Record<string, unknown>,
    canAccess,
  };
}

/** Ensure LiveKit voice room name is attached (no-op if voice disabled / no access). */
export async function ensureRoomVoiceChannel(roomId: string): Promise<string | null> {
  const { data, error } = await db().rpc("ensure_room_voice_channel", { p_room: roomId });
  if (error) return null;
  return (data as string) ?? null;
}

export async function listRoomMessages(roomId: string, limit = 100): Promise<import("@/types").RoomMessage[]> {
  const uid = await currentUserId();
  const { data } = await db().from("room_messages")
    .select("id,room_id,sender_id,body,created_at,reactions").eq("room_id", roomId)
    .order("created_at", { ascending: true }).limit(limit);
  if (!data) return [];
  const names = await creatorNamesFor(data.map((m: any) => m.sender_id));
  return data.map((m: any) => ({
    id: m.id, roomId: m.room_id, senderId: m.sender_id, senderName: names.get(m.sender_id) ?? null,
    body: m.body, createdAt: new Date(m.created_at).getTime(), mine: m.sender_id === uid,
    reactions: (m.reactions && typeof m.reactions === "object") ? m.reactions as Record<string, string[]> : {},
  }));
}

export async function sendRoomMessage(roomId: string, body: string) {
  const uid = await currentUserId();
  if (!uid) return;
  const clean = body.trim().slice(0, 2000);
  if (!clean) return;
  await db().from("room_messages").insert({ room_id: roomId, sender_id: uid, body: clean });
  void awardSocialVc("room_message", "room", roomId).catch(() => undefined);
}

/** Toggle an emoji reaction on a room message. */
export async function toggleRoomReaction(messageId: string, emoji: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { data } = await db().from("room_messages").select("reactions").eq("id", messageId).maybeSingle();
  if (!data) return false;
  const reactions = { ...((data.reactions as Record<string, string[]>) ?? {}) };
  const list = new Set(reactions[emoji] ?? []);
  if (list.has(uid)) list.delete(uid);
  else list.add(uid);
  if (list.size) reactions[emoji] = Array.from(list);
  else delete reactions[emoji];
  const { error } = await db().from("room_messages").update({ reactions }).eq("id", messageId);
  return !error;
}

/** Join a room's live presence channel; `onSync` receives the current occupants. */
export function joinRoomPresence(
  roomId: string,
  me: { id: string; username: string | null },
  onSync: (users: import("@/types").RoomPresence[]) => void,
): RealtimeChannel {
  const ch = db().channel(`room-presence:${roomId}`, { config: { presence: { key: me.id } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, { user_id: string; username: string | null; typing?: boolean }[]>;
    const seen = new Map<string, import("@/types").RoomPresence>();
    Object.values(state).flat().forEach((p) =>
      seen.set(p.user_id, { userId: p.user_id, username: p.username ?? null, typing: !!p.typing }),
    );
    onSync(Array.from(seen.values()));
  });
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") void ch.track({ user_id: me.id, username: me.username, typing: false });
  });
  return ch;
}

export async function setRoomTyping(ch: RealtimeChannel | null, me: { id: string; username: string | null }, typing: boolean) {
  if (!ch) return;
  await ch.track({ user_id: me.id, username: me.username, typing });
}

// ── Stream: public live sessions (Bunny Stream + identity chat) ─────────────
export async function listLiveSessions(limit = 40): Promise<LiveSessionCard[]> {
  const { data, error } = await db().rpc("list_live_sessions", { lim: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    hostId: r.host_id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    roleLabel: r.role_label ?? null,
    title: r.title ?? null,
    source: resolveLiveSource(r.source, r.monetization as Record<string, unknown> | null),
    intent: r.intent ?? null,
    viewerCount: r.viewer_count ?? 0,
    playbackHls: r.playback_hls ?? null,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : Date.now(),
    visibility: (r.visibility === "circle" ? "circle" : "world") as import("@/types").LiveAudience,
  }));
}

export async function getLiveSession(id: string): Promise<LiveSessionDetail | null> {
  const me = await currentUserId();
  const { data, error } = await db().from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;

  // Circle vs world gate for non-hosts
  if (me !== data.host_id) {
    const { data: allowed } = await db().rpc("can_watch_live", { p_session: id });
    if (allowed === false) return null;
  }

  const { data: host } = await db().from("profiles").select("username, display_name, avatar_url, profile").eq("id", data.host_id).maybeSingle();
  const profile = (host?.profile ?? {}) as Record<string, unknown>;
  const visRaw = String(data.visibility ?? "world");
  const mon = (data.monetization ?? {}) as Record<string, unknown>;
  return {
    id: data.id,
    hostId: data.host_id,
    username: host?.username ?? null,
    displayName: host?.display_name ?? null,
    avatarUrl: host?.avatar_url ?? null,
    roleLabel: (profile.roleLabel as string) ?? (profile.role as string) ?? null,
    title: data.title ?? null,
    source: resolveLiveSource(data.source, mon),
    intent: data.intent ?? null,
    viewerCount: data.viewer_count ?? 0,
    playbackHls: data.playback_hls ?? null,
    startedAt: data.started_at ? new Date(data.started_at).getTime() : Date.now(),
    status: data.status,
    bunnyGuid: data.bunny_guid ?? null,
    rtmpUrl: me === data.host_id ? (data.rtmp_url ?? null) : null,
    streamKey: me === data.host_id ? (data.stream_key ?? null) : null,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : Date.now(),
    livekitRoom: data.livekit_room ?? null,
    sfuProvider: data.sfu_provider ?? null,
    audioMode: (data.audio_mode as "music" | "speech") ?? "music",
    visibility: visRaw === "circle" ? "circle" : "world",
    tipGoal: Number(mon.tip_goal ?? 0) || 0,
    tipRaised: Number(mon.tip_raised ?? 0) || 0,
    tipCount: Number(mon.tip_count ?? 0) || 0,
  };
}

/** Start a live session. Optionally provisions Bunny Stream via edge function. */
export async function startLiveSession(input: {
  title?: string;
  source: LiveSource;
  intent?: string;
  visibility?: import("@/types").LiveAudience;
}): Promise<LiveSessionDetail | null> {
  const me = await currentUserId();
  if (!me) return null;

  if (FLAGS.atc) {
    const gate = await canStartLive();
    if (!gate?.ok) return null;
  }

  // End any prior live session for this host (unique index).
  await db().from("live_sessions").update({ status: "ended", ended_at: new Date().toISOString(), stream_key: null })
    .eq("host_id", me).eq("status", "live");

  let bunny: { guid?: string; playbackHls?: string; rtmpUrl?: string; streamKey?: string } = {};
  try {
    const { data: sess } = await db().auth.getSession();
    const token = sess.session?.access_token;
    if (token && SUPABASE_URL) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bunny-live`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "create", title: input.title || "Live on VYBZ" }),
      });
      if (res.ok) bunny = await res.json();
    }
  } catch { /* Bunny optional — presence + chat still work */ }

  const visibility = input.visibility === "circle" ? "circle" : "world";
  const audioMode = audioModeForSource(input.source);

  const baseRow = {
    host_id: me,
    title: input.title?.trim() || null,
    intent: input.intent?.trim() || null,
    bunny_guid: bunny.guid ?? null,
    playback_hls: bunny.playbackHls ?? null,
    rtmp_url: bunny.rtmpUrl ?? null,
    stream_key: bunny.streamKey ?? null,
    quality_tier: "ultra",
    visibility,
    audio_mode: audioMode,
    sfu_provider: "livekit",
  };

  let { data, error } = await db().from("live_sessions").insert({
    ...baseRow,
    source: persistableLiveSource(input.source),
    input_mode: persistableLiveSource(input.source),
    monetization: sourceIngestPatch(input.source),
  }).select("*").single();

  if (error && input.source === "daw" && isCheckViolation(error)) {
    const fallback = legacyDawFallback(input.source);
    ({ data, error } = await db().from("live_sessions").insert({
      ...baseRow,
      ...fallback,
    }).select("*").single());
  }
  if (error || !data) return null;

  void awardSocialVc("go_live", "live", data.id).catch(() => undefined);

  // Attach LiveKit room name (Edge mints tokens; works when LIVEKIT_* secrets set)
  try {
    await db().rpc("attach_live_sfu", {
      p_session: data.id,
      p_provider: "livekit",
      p_room: `vybz-live-${data.id}`,
      p_audio_mode: audioMode,
    });
  } catch { /* SFU optional until secrets exist */ }

  void openProvenanceForLive(data.id).catch(() => undefined);

  return getLiveSession(data.id);
}

export async function endLiveSession(id: string): Promise<void> {
  await sealProvenanceForLive(id).catch(() => false);
  await db().rpc("end_live_session", { p_id: id });
  try {
    const { data: sess } = await db().auth.getSession();
    const token = sess.session?.access_token;
    const detail = await getLiveSession(id);
    if (token && SUPABASE_URL && detail?.bunnyGuid) {
      await fetch(`${SUPABASE_URL}/functions/v1/bunny-live`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end", guid: detail.bunnyGuid }),
      });
    }
  } catch { /* ignore */ }
}

export async function bumpLiveViewers(id: string, delta = 1): Promise<void> {
  await db().rpc("bump_live_viewers", { p_id: id, delta });
}

export async function listLiveMessages(sessionId: string, limit = 80): Promise<LiveMessage[]> {
  const me = await currentUserId();
  const { data, error } = await db()
    .from("live_messages")
    .select("id, session_id, sender_id, body, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  const names = await usernamesFor(data.map((m: { sender_id: string }) => m.sender_id));
  return (data as any[]).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    senderId: r.sender_id,
    senderName: names.get(r.sender_id) ?? null,
    body: r.body,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    mine: r.sender_id === me,
  }));
}

export async function sendLiveMessage(sessionId: string, body: string): Promise<LiveMessage | null> {
  const me = await currentUserId();
  if (!me) return null;
  const text = body.trim().slice(0, 1000);
  if (!text) return null;
  const { data, error } = await db().from("live_messages").insert({
    session_id: sessionId,
    sender_id: me,
    body: text,
  }).select("id, session_id, sender_id, body, created_at").single();
  if (error || !data) return null;
  const { data: prof } = await db().from("profiles").select("username").eq("id", me).maybeSingle();
  return {
    id: data.id,
    sessionId: data.session_id,
    senderId: data.sender_id,
    senderName: prof?.username ?? null,
    body: data.body,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    mine: true,
  };
}

export function subscribeLiveMessages(sessionId: string, cb: () => void): RealtimeChannel {
  return subscribeInserts("live_messages", `session_id=eq.${sessionId}`, cb);
}

export function subscribeLiveSessions(cb: () => void): RealtimeChannel {
  const ch = db().channel(`rt-live-sessions-${Math.random().toString(36).slice(2)}`);
  ch.on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => cb()).subscribe();
  return ch;
}

// ── Live: synchronized listening (Phase G v1) ───────────────────────────────
// Host broadcasts their player state to everyone in the room over a Realtime
// broadcast channel; followers' AudioBus mirrors it. No media server needed.
export interface ListenState {
  hostId: string;
  hostName: string | null;
  track: import("@/lib/audioBus").PlayerTrack | null;
  positionSec: number;
  playing: boolean;
  at: number; // sender clock (ms) for drift compensation
  ended?: boolean;
}
export function joinRoomListen(roomId: string, onSync: (s: ListenState) => void): RealtimeChannel {
  const ch = db().channel(`room-listen:${roomId}`, { config: { broadcast: { self: false } } });
  ch.on("broadcast", { event: "sync" }, (msg: { payload: ListenState }) => onSync(msg.payload));
  ch.subscribe();
  return ch;
}
export function sendListen(ch: RealtimeChannel, state: ListenState) {
  void ch.send({ type: "broadcast", event: "sync", payload: state });
}

/** Persist a connected external playlist into thin queue tables (best-effort). */
export async function upsertConnectedPlaylist(
  playlist: {
    id: string;
    provider: string;
    externalUrl: string;
    title: string;
    trackCount: number;
  },
  tracks: { id: string; title: string; artist: string; url: string; durationSec?: number }[],
): Promise<void> {
  const me = await currentUserId();
  if (!me) return;
  const { error } = await db().from("playlists").upsert({
    id: playlist.id,
    owner_id: me,
    provider: playlist.provider,
    external_url: playlist.externalUrl,
    title: playlist.title,
    track_count: playlist.trackCount,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) return;
  await db().from("playlist_tracks").delete().eq("playlist_id", playlist.id);
  if (tracks.length) {
    await db().from("playlist_tracks").insert(
      tracks.map((t, i) => ({
        playlist_id: playlist.id,
        track_id: t.id,
        title: t.title,
        artist: t.artist,
        url: t.url,
        duration_sec: t.durationSec ?? null,
        position: i,
      })),
    );
  }
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

// ── VYBZ Credits (Vc) wallet ─────────────────────────────────────────────────
export interface VcLedgerRow {
  id: string;
  createdAt: number;
  fromId: string | null;
  toId: string | null;
  amount: number;
  balanceAfter: number | null;
  kind: string;
  refType: string | null;
  refId: string | null;
  memo: string | null;
}

export async function ensureVcSignupGrant(): Promise<number> {
  const { data, error } = await db().rpc("vc_signup_grant");
  if (error) return 0;
  return Number(data ?? 0);
}

export async function transferVc(
  username: string,
  amount: number,
  memo?: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data, error } = await db().rpc("vc_transfer_username", {
    p_username: parseVcAddress(username),
    p_amount: amount,
    p_memo: memo?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data as string };
}

export async function awardSocialVc(
  event: string,
  refType?: string,
  refId?: string,
  idempotency?: string,
): Promise<number> {
  const { data, error } = await db().rpc("vc_award", {
    p_event: event,
    p_ref_type: refType ?? null,
    p_ref_id: refId ?? null,
    p_idempotency: idempotency ?? null,
  });
  if (error) return 0;
  return Number(data ?? 0);
}

export async function listVcLedger(limit = 40): Promise<VcLedgerRow[]> {
  const { data, error } = await db().rpc("vc_list_ledger", { p_limit: limit, p_before: null });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    id: r.id,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    fromId: r.from_id ?? null,
    toId: r.to_id ?? null,
    amount: Number(r.amount ?? 0),
    balanceAfter: r.balance_after != null ? Number(r.balance_after) : null,
    kind: String(r.kind ?? ""),
    refType: r.ref_type ?? null,
    refId: r.ref_id ?? null,
    memo: r.memo ?? null,
  }));
}

export async function liveSetTipGoal(sessionId: string, goal: number): Promise<{ ok: boolean; tipGoal?: number; tipRaised?: number; tipCount?: number; error?: string }> {
  const { data, error } = await db().rpc("live_set_tip_goal", { p_session: sessionId, p_goal: goal });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok?: boolean; error?: string; monetization?: Record<string, unknown> } | null;
  if (!r?.ok) return { ok: false, error: r?.error || "failed" };
  const m = r.monetization ?? {};
  return {
    ok: true,
    tipGoal: Number(m.tip_goal ?? goal),
    tipRaised: Number(m.tip_raised ?? 0),
    tipCount: Number(m.tip_count ?? 0),
  };
}

export async function liveTip(
  sessionId: string,
  amount: number,
  memo?: string,
): Promise<{ ok: boolean; tipGoal?: number; tipRaised?: number; tipCount?: number; error?: string }> {
  const { data, error } = await db().rpc("live_tip", {
    p_session: sessionId,
    p_amount: amount,
    p_memo: memo ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok?: boolean; error?: string; monetization?: Record<string, unknown> } | null;
  if (!r?.ok) return { ok: false, error: r?.error || "failed" };
  const m = r.monetization ?? {};
  return {
    ok: true,
    tipGoal: Number(m.tip_goal ?? 0),
    tipRaised: Number(m.tip_raised ?? 0),
    tipCount: Number(m.tip_count ?? 0),
  };
}

export interface VybzList {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;
  trackCount: number;
  updatedAt: number;
}

export async function createVybzList(title: string, description?: string): Promise<string | null> {
  const { data, error } = await db().rpc("vybz_list_create", {
    p_title: title,
    p_description: description ?? null,
  });
  if (error || !data) return null;
  return data as string;
}

export async function addToVybzList(listId: string, dropId: string): Promise<boolean> {
  const { data, error } = await db().rpc("vybz_list_add_track", { p_list: listId, p_drop: dropId });
  return !error && !!data;
}

export async function removeFromVybzList(listId: string, dropId: string): Promise<boolean> {
  const { error } = await db()
    .from("vybz_list_tracks")
    .delete()
    .eq("list_id", listId)
    .eq("drop_id", dropId);
  return !error;
}

export async function listMyVybzLists(limit = 40): Promise<VybzList[]> {
  const { data, error } = await db().rpc("vybz_list_mine", { p_limit: limit });
  if (error || !data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title ?? "Untitled",
    description: r.description ?? null,
    isPublic: !!r.is_public,
    ownerId: r.owner_id,
    trackCount: Number(r.track_count ?? 0),
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
  }));
}

export async function vybzListDropIds(listId: string): Promise<string[]> {
  const { data, error } = await db().rpc("vybz_list_drop_ids", { p_list: listId });
  if (error || !data) return [];
  return (data as string[]).map(String);
}

export async function dropsByIds(ids: string[]): Promise<Drop[]> {
  if (!ids.length) return [];
  const myId = await currentUserId();
  const { data } = await db().from("drops").select("*").in("id", ids);
  if (!data?.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...data].sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return assembleDrops(sorted, myId);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
