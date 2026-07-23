// ---------------------------------------------------------------------------
// VYBZ data access. Thin, typed wrappers over Supabase (auth, profiles, creator
// roles, matchmaking, drops, assets, ratings, connections, DMs). Identity-first:
// every call assumes a real, signed-in creator.
// ---------------------------------------------------------------------------

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
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
  Cosmetic, CosmeticStore,
  LiveSessionCard, LiveSessionDetail, LiveMessage, LiveSource,
  PostFx, PostAudience, PlaybackCustomization, ArtistProfile,
} from "@/types";
import { buildPlaybackCustomization, parsePlaybackCustomization } from "@/lib/playbackCustomization";
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
    platformRole: (r.platform_role ?? (r.is_admin ? "admin" : "member")) as Profile["platformRole"],
    modPoints: r.mod_points ?? 0,
    equippedCosmetics: (r.equipped_cosmetics ?? {}) as Record<string, string>,
    banned: r.banned ?? false,
    profile: (r.profile ?? {}) as ProfileDetails,
    featuredDropId: r.featured_drop_id ?? null,
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
export async function listCosmetics(): Promise<CosmeticStore> {
  const { data, error } = await db().rpc("list_cosmetics");
  const store = (error || !data) ? { credits: 0, equipped: {}, owned: [], catalog: [] } : (data as CosmeticStore);
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

// ── Matchmaking ──────────────────────────────────────────────────────────────
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
}
export async function applyToOpportunity(postId: string, message?: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await db().from("collab_applications").insert({
    post_id: postId, applicant_id: uid, message: message ?? null,
  });
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
let iceCache: { at: number; servers: RTCIceServer[] } | null = null;
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (iceCache && now - iceCache.at < 8 * 60_000) return iceCache.servers;
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  try {
    const { data, error } = await db().functions.invoke("ice-servers", { body: {} });
    if (error || !(data as any)?.iceServers) return fallback;
    const servers = (data as any).iceServers as RTCIceServer[];
    iceCache = { at: now, servers };
    return servers;
  } catch {
    return fallback;
  }
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
/** Secure-zone (token-authed Bunny) paths look like `drops/…` or `projects/…`. */
const isSecurePath = (p: string) => /^(drops|projects)\//.test(p);

/**
 * Upload a protected drop original to Bunny's isolated, token-authed secure zone
 * (via the bunny-upload Edge Function — the write key stays server-side). Returns
 * the storage path (e.g. `drops/<uid>/…`), which is what we persist on the asset.
 * The raw object is never publicly reachable; previews are signed on demand and
 * downloads are fetched server-side for watermarking.
 */
export async function uploadAudio(file: Blob, ext: string, onProgress?: (pct: number) => void): Promise<string | null> {
  const sess = (await db().auth.getSession()).data.session;
  if (!sess) return null;
  const ct = (file as File).type || (ext === "wav" ? "audio/wav" : ext === "flac" ? "audio/flac" : "audio/mpeg");
  const endpoint = `${SUPABASE_URL}/functions/v1/bunny-upload?kind=drop&name=${encodeURIComponent("a." + ext)}`;
  // XHR (not fetch) so we can report real upload progress for large files.
  return new Promise<string | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${sess.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("content-type", ct);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve((JSON.parse(xhr.responseText).path as string) ?? null); } catch { resolve(null); }
      } else resolve(null);
    };
    xhr.onerror = () => resolve(null);
    xhr.send(file);
  });
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

async function signAudio(paths: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const real = paths.filter((p) => p && !/^(https?:|data:|blob:)/i.test(p));
  if (!real.length) return m;
  // Secure Bunny drops → token-signed CDN URLs; legacy Supabase paths → storage signing.
  const secure = real.filter(isSecurePath);
  const legacy = real.filter((p) => !isSecurePath(p));
  if (secure.length) (await bunnySign(secure)).forEach((v, k) => m.set(k, v));
  if (legacy.length) {
    const { data } = await db().storage.from(AUDIO_BUCKET).createSignedUrls(legacy, SIGN_TTL);
    (data ?? []).forEach((d) => { if (d.path && d.signedUrl) m.set(d.path, d.signedUrl); });
  }
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
  license?: string;
  sha256?: string; fingerprint?: string;
  fx?: PostFx;
  audience?: PostAudience;
  inviteeIds?: string[];
  playbackCustomization?: PlaybackCustomization;
  creditedArtist?: string;
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
  const batchId = input.releaseBatchId || null;
  let drop: { id: string; created_at: string } | null = null;
  {
    const res = await db().from("drops").insert({
      author_id: uid, title: input.title ?? null, body: input.body ?? null,
      asset_id: assetId, seed: input.seed, fx, audience,
      playback_customization: playback,
      credited_artist: credited,
      release_batch_id: batchId,
    }).select("id,created_at").single();
    if (!res.error && res.data) drop = res.data as { id: string; created_at: string };
    else {
      const mid = await db().from("drops").insert({
        author_id: uid, title: input.title ?? null, body: input.body ?? null,
        asset_id: assetId, seed: input.seed, fx, audience,
        playback_customization: playback,
        credited_artist: credited,
      }).select("id,created_at").single();
      if (!mid.error && mid.data) drop = mid.data as { id: string; created_at: string };
      else {
        const mid2 = await db().from("drops").insert({
          author_id: uid, title: input.title ?? null, body: input.body ?? null,
          asset_id: assetId, seed: input.seed, fx, audience,
          credited_artist: credited,
        }).select("id,created_at").single();
        if (!mid2.error && mid2.data) drop = mid2.data as { id: string; created_at: string };
        else {
          const mid3 = await db().from("drops").insert({
            author_id: uid, title: input.title ?? null, body: input.body ?? null,
            asset_id: assetId, seed: input.seed, fx, audience,
          }).select("id,created_at").single();
          if (!mid3.error && mid3.data) drop = mid3.data as { id: string; created_at: string };
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
  if (!drop) return null;
  if (audience === "private" && input.inviteeIds?.length) {
    const rows = input.inviteeIds.filter((id) => id && id !== uid).map((invitee_id) => ({
      drop_id: drop!.id, invitee_id,
    }));
    if (rows.length) await db().from("drop_invites").upsert(rows).then(() => undefined, () => undefined);
  }
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
      audioUrl: a ? (signed.get(a.url) ?? a.url) : undefined,
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
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id")
    .eq("audience", "public")
    .order("created_at", { ascending: false }).limit(limit);
  return assembleDrops(data ?? [], myId);
}
export async function dropsBy(authorId: string, limit = 40) {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id")
    .eq("author_id", authorId).order("created_at", { ascending: false }).limit(limit);
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

export async function dropsForArtist(artistId: string, limit = 40): Promise<Drop[]> {
  const myId = await currentUserId();
  const { data } = await db().from("drops")
    .select("id,author_id,title,body,seed,feels,wilds,created_at,asset_id,plays,fx,audience,playback_customization,credited_artist,artist_id")
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

export async function react(dropId: string, reaction: Reaction) {
  const uid = await currentUserId();
  if (!uid) return;
  await db().from("reactions").upsert({ drop_id: dropId, user_id: uid, reaction });
}
export async function rateTrack(dropId: string, stars: number) {
  await db().rpc("rate_track", { p_drop: dropId, p_rating: stars });
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
  const { data } = await db().storage.from(AUDIO_BUCKET).createSignedUrl(path as string, SIGN_TTL, { download: true });
  return data?.signedUrl ? { url: data.signedUrl, watermarked: false, revoke: false } : null;
}

// ── Connections + DMs ────────────────────────────────────────────────────────
export async function connect(peerId: string) {
  const uid = await currentUserId();
  if (!uid || uid === peerId) return;
  await db().from("connections").upsert({ requester_id: uid, addressee_id: peerId, status: "pending" });
}

/** Accept or decline an incoming connection request (addressee only). */
export async function respondConnection(requesterId: string, accept: boolean): Promise<boolean> {
  const { data, error } = await db().rpc("respond_connection", {
    p_requester: requesterId,
    p_accept: accept,
  });
  if (error) return false;
  return !!data;
}

/** Persist Spark / connection outcomes for future LTR tuning. */
export async function logMatchFeedback(
  peerId: string,
  outcome: "accepted" | "declined" | "pass" | "connect",
  source: "spark" | "connection" | "connect_page" = "spark",
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
  }));
}

export async function getRoom(id: string): Promise<import("@/types").Room | null> {
  const { data } = await db().from("rooms").select("id,kind,ref_id,title").eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as any;
  return { id: r.id, kind: r.kind, refId: r.ref_id, title: r.title, messages: 0, lastAt: null };
}

export async function listRoomMessages(roomId: string, limit = 100): Promise<import("@/types").RoomMessage[]> {
  const uid = await currentUserId();
  const { data } = await db().from("room_messages")
    .select("id,room_id,sender_id,body,created_at").eq("room_id", roomId)
    .order("created_at", { ascending: true }).limit(limit);
  if (!data) return [];
  const names = await usernamesFor(data.map((m: any) => m.sender_id));
  return data.map((m: any) => ({
    id: m.id, roomId: m.room_id, senderId: m.sender_id, senderName: names.get(m.sender_id) ?? null,
    body: m.body, createdAt: new Date(m.created_at).getTime(), mine: m.sender_id === uid,
  }));
}

export async function sendRoomMessage(roomId: string, body: string) {
  const uid = await currentUserId();
  if (!uid) return;
  const clean = body.trim().slice(0, 2000);
  if (!clean) return;
  await db().from("room_messages").insert({ room_id: roomId, sender_id: uid, body: clean });
}

/** Join a room's live presence channel; `onSync` receives the current occupants. */
export function joinRoomPresence(
  roomId: string,
  me: { id: string; username: string | null },
  onSync: (users: import("@/types").RoomPresence[]) => void,
): RealtimeChannel {
  const ch = db().channel(`room-presence:${roomId}`, { config: { presence: { key: me.id } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, { user_id: string; username: string | null }[]>;
    const seen = new Map<string, import("@/types").RoomPresence>();
    Object.values(state).flat().forEach((p) => seen.set(p.user_id, { userId: p.user_id, username: p.username ?? null }));
    onSync(Array.from(seen.values()));
  });
  ch.subscribe((status) => { if (status === "SUBSCRIBED") void ch.track({ user_id: me.id, username: me.username }); });
  return ch;
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
    source: r.source as LiveSource,
    intent: r.intent ?? null,
    viewerCount: r.viewer_count ?? 0,
    playbackHls: r.playback_hls ?? null,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : Date.now(),
  }));
}

export async function getLiveSession(id: string): Promise<LiveSessionDetail | null> {
  const me = await currentUserId();
  const { data, error } = await db().from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const { data: host } = await db().from("profiles").select("username, display_name, avatar_url, profile").eq("id", data.host_id).maybeSingle();
  const profile = (host?.profile ?? {}) as Record<string, unknown>;
  return {
    id: data.id,
    hostId: data.host_id,
    username: host?.username ?? null,
    displayName: host?.display_name ?? null,
    avatarUrl: host?.avatar_url ?? null,
    roleLabel: (profile.roleLabel as string) ?? (profile.role as string) ?? null,
    title: data.title ?? null,
    source: data.source as LiveSource,
    intent: data.intent ?? null,
    viewerCount: data.viewer_count ?? 0,
    playbackHls: data.playback_hls ?? null,
    startedAt: data.started_at ? new Date(data.started_at).getTime() : Date.now(),
    status: data.status,
    bunnyGuid: data.bunny_guid ?? null,
    rtmpUrl: me === data.host_id ? (data.rtmp_url ?? null) : null,
    streamKey: me === data.host_id ? (data.stream_key ?? null) : null,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : Date.now(),
  };
}

/** Start a live session. Optionally provisions Bunny Stream via edge function. */
export async function startLiveSession(input: {
  title?: string;
  source: LiveSource;
  intent?: string;
}): Promise<LiveSessionDetail | null> {
  const me = await currentUserId();
  if (!me) return null;

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

  const { data, error } = await db().from("live_sessions").insert({
    host_id: me,
    title: input.title?.trim() || null,
    source: input.source,
    intent: input.intent?.trim() || null,
    bunny_guid: bunny.guid ?? null,
    playback_hls: bunny.playbackHls ?? null,
    rtmp_url: bunny.rtmpUrl ?? null,
    stream_key: bunny.streamKey ?? null,
  }).select("*").single();
  if (error || !data) return null;
  return getLiveSession(data.id);
}

export async function endLiveSession(id: string): Promise<void> {
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
