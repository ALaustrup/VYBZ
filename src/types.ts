// ---------------------------------------------------------------------------
// VYBZ domain types. Identity-first: every account is a real creator.
// ---------------------------------------------------------------------------

export type Reaction = "feel" | "wild";

export type AssetKind =
  | "sample" | "loop" | "oneshot" | "stem" | "acapella"
  | "midi" | "preset" | "project" | "track";

/** Owner-editable music facets + privacy (stored in profiles.profile jsonb). */
export interface ProfileDetails {
  bio?: string;
  genres?: string[];
  daws?: string[];
  plugins?: string[];
  influences?: string;
  tempoMin?: number;
  tempoMax?: number;
  keys?: string[];
  remoteOk?: boolean;
  openToWork?: boolean;
  lookingFor?: string[];
  languages?: string[];
  prompts?: { q: string; a: string }[];
  traits?: Record<string, string>;
  /** Primary creative role (catalog role id), chosen at onboarding. */
  role?: string | null;
  /** Human-readable role label (may be a pending custom role). */
  roleLabel?: string;
  /** What the creator is here for — drives default feed curation. */
  intents?: string[];
  /** Primary profession (category id): music | visual_art | film_video | game_dev. */
  profession?: string | null;
  /** Primary + optional secondary professions (category ids), primary first. */
  professions?: string[];
  /** Top-level keys the creator has marked private. */
  hidden?: string[];
}

export interface Profile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  musicUrl: string | null;
  identityPublic: boolean;
  isAdmin: boolean;
  platformRole: PlatformRole;
  modPoints: number;
  equippedCosmetics: Record<string, string>;
  banned: boolean;
  profile: ProfileDetails;
  /** The drop the creator has chosen to headline their profile (Library). */
  featuredDropId?: string | null;
  createdAt: number;
}

/** A drop = an audio post carrying the creator's identity. */
export interface Drop {
  id: string;
  authorId: string;
  authorUsername: string | null;
  title: string | null;
  body: string | null;
  seed: number;
  feels: number;
  wilds: number;
  createdAt: number;
  // Linked audio asset facets (nullable for a text-only drop).
  assetId?: string | null;
  audioUrl?: string;
  waveform?: number[];
  durationSec?: number;
  assetKind?: AssetKind;
  bpm?: number | null;
  musicalKey?: string | null;
  audioFormat?: string | null;
  sampleRate?: number | null;
  lossless?: boolean;
  /** Exchange license for the asset: 'collab-only' | 'credit-required' | 'free'. */
  license?: string | null;
  rating?: number;
  ratingCount?: number;
  plays?: number;
}

export interface RoleOffer { roleId: string; skill: number }
export interface RoleSeek { roleId: string; priority: number }

export interface CollabMatch {
  userId: string;
  username: string | null;
  offersYouSeek: string[];
  seeksYouOffer: string[];
  mutual: boolean;
  sharedGenres: string[];
  sharedDaws: string[];
  sharedPlugins: string[];
  openToWork: boolean;
  resonance: number;
  /** 0..1 reputation (rating-weighted + social proof). */
  reputation: number;
  fit: number;
  /** Disciplines you both actively practice (strong "you both do X" signal). */
  sharedDisciplines: string[];
  /** 0..1 read of how much independent evidence backs this match (§5.4k). */
  confidence: number;
}

export interface CreatorStats {
  avgRating: number;
  ratings: number;
  drops: number;
  connections: number;
  reputation: number;
}

export type Commitment = "one-off" | "ongoing" | "session" | "band-member";

export interface Opportunity {
  id: string;
  authorId: string;
  authorUsername: string | null;
  roleNeeded: string;
  roleLabel: string;
  title: string;
  body: string | null;
  genres: string[];
  daws: string[];
  remoteOk: boolean;
  location: string | null;
  commitment: Commitment | null;
  createdAt: number;
  sharedGenres: string[];
  sharedDaws: string[];
  applied: boolean;
  fit: number;
}

export interface DmThread {
  id: string;
  peerId: string;
  peerUsername: string | null;
  lastAt: number;
}

export interface DmMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: number;
  mine: boolean;
}

export type NotificationKind = "connection" | "application" | "message" | "match";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  title: string;
  body: string | null;
  refId: string | null;
  read: boolean;
  createdAt: number;
}

export interface CreatorSearchResult {
  userId: string;
  username: string | null;
  location: string | null;
  offers: string[];
  seeks: string[];
  genres: string[];
}

// ── Phase D: projects, versioned handoff, split sheets, verified credits ──────
export type ProjectStatus = "open" | "in-progress" | "released" | "archived";

export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  ownerId: string;
  isOwner: boolean;
  members: number;
  versions: number;
  createdAt: number;
}

export interface ProjectCollaborator {
  userId: string;
  username: string | null;
  role: string | null;
  canUpload: boolean;
  split: number;
  agreed: boolean;
}

export interface ProjectVersion {
  id: string;
  version: number;
  note: string | null;
  uploader: string | null;
  assetId: string | null;
  kind: string | null;
  format: string | null;
  createdAt: number;
}

export interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  bpm: number | null;
  musicalKey: string | null;
  genres: string[];
  status: ProjectStatus;
  ownerId: string;
  isOwner: boolean;
  releasedAt: number | null;
  createdAt: number;
  collaborators: ProjectCollaborator[];
  versions: ProjectVersion[];
}

export interface Credit {
  projectId: string;
  title: string;
  role: string | null;
  releasedAt: number | null;
  split: number | null;
}

// ── Phase F: categorized collab chat (taxonomy-bound rooms + presence) ────────
export type RoomKind = "role" | "genre" | "daw";

export interface Room {
  id: string;
  kind: RoomKind;
  refId: string;
  title: string;
  messages: number;
  lastAt: number | null;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string | null;
  body: string;
  createdAt: number;
  mine: boolean;
}

export interface RoomPresence {
  userId: string;
  username: string | null;
}

// ── Dynamic discipline modules (tabbed, multi-discipline profiles) ───────────
export type FieldType =
  | "text" | "textarea" | "number" | "select" | "multiselect"
  | "proficiency_list" | "role_multiselect" | "repeater";

/** A discipline-specific field, described by the server-side schema registry. */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Inline option list, or a named catalog: "genres" | "daws" | "roles:<category>". */
  options?: string | string[];
  hint?: string;
  /** Relative weight this field contributes to matchmaking (server-side). */
  matchWeight?: number;
}

export interface DisciplineSchema {
  fields: FieldDef[];
}

/** One selectable discipline within a category (a role in the catalog). */
export interface DisciplineOption {
  id: string;
  label: string;
  family: string;
  hasSchema: boolean;
}

/** A top-level creative vertical, with its selectable disciplines. */
export interface DisciplineCategory {
  id: string;
  label: string;
  icon: string | null;
  sort: number;
  disciplines: DisciplineOption[];
}

/** "What are you seeking?" intents, shared across every discipline module. */
export type SeekingIntent = "paid" | "collab" | "mentorship" | "cofounding" | "spark";

export interface PortfolioItem {
  title?: string;
  url: string;
  kind?: string;
}

/** A creator's instance of a discipline on their profile — one tab. */
export interface DisciplineModule {
  id: string;
  roleId: string;
  category: string | null;
  label: string;
  headline: string | null;
  yearsExp: number | null;
  collabStyle: string | null;
  availability: string | null;
  seeking: SeekingIntent[];
  skill: number | null;
  attrs: Record<string, unknown>;
  portfolio: PortfolioItem[];
  sort: number;
}

// ── Projects (profile_projects — public creator projects / channels) ─────────
// DB table remains profile_projects; UI copy is "Projects" (unified — "Spaces"
// retired). Each Project has content (posts/links) + a widget dashboard and is
// shown on the profile. Private collaboration rooms live in `projects` and are
// branded "Collabs" in the nav.
export type ProjectKind = "music" | "video" | "art" | "writing" | "links" | "general";

/** A pluggable data/showcase card on a Project (embeds or gated API connectors). */
export interface ProjectWidget {
  id: string;
  kind: string;
  title: string | null;
  config: { url?: string; [k: string]: unknown };
  sort?: number;
}
export type PostKind = "text" | "audio" | "image" | "video" | "link";
export type PostFx = "off" | "glow" | "aurora" | "pulse" | "bars" | "ripple";

export interface ProfileProject {
  id: string;
  userId: string;
  name: string;
  kind: ProjectKind;
  tagline: string | null;
  accent: string | null;
  coverUrl: string | null;
  sort: number;
  posts: number;
  links: number;
  followers: number;
  following: boolean;
}

export interface ProjectPost {
  id: string;
  kind: PostKind;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  linkUrl: string | null;
  createdAt: number;
  fx?: PostFx | null;
  likes: number;
  liked: boolean;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string | null;
  thumbUrl: string | null;
  targetProjectId: string | null;
  sort: number;
}

export interface ProfileProjectDetail {
  id: string;
  userId: string;
  name: string;
  kind: ProjectKind;
  tagline: string | null;
  accent: string | null;
  coverUrl: string | null;
  followers: number;
  following: boolean;
  posts: ProjectPost[];
  links: ProjectLink[];
  widgets: ProjectWidget[];
}

export interface FeedPost {
  id: string;
  kind: PostKind;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  linkUrl: string | null;
  createdAt: number;
  fx?: PostFx | null;
  projectId: string;
  projectName: string;
  projectKind: ProjectKind;
  accent: string | null;
  authorId: string;
  authorUsername: string | null;
  authorAvatarUrl?: string | null;
  likes: number;
  liked: boolean;
}

export interface ProjectInput { name: string; kind: ProjectKind; tagline?: string | null; accent?: string | null; coverUrl?: string | null }
export type PostAudience = "public" | "followers";
export interface PostInput { projectId: string; kind: PostKind; title?: string | null; body?: string | null; mediaUrl?: string | null; linkUrl?: string | null; audience?: PostAudience; scheduledAt?: string | null; fx?: PostFx }
export interface LinkInput { projectId: string; label: string; url?: string | null; thumbUrl?: string | null; targetProjectId?: string | null }

// ── Admin console ────────────────────────────────────────────────────────────
export interface AdminMember {
  userId: string;
  username: string | null;
  location: string | null;
  isAdmin: boolean;
  role: PlatformRole;
  points: number;
  banned: boolean;
  createdAt: string;
  modules: number;
  drops: number;
}

export interface PendingDiscipline {
  id: string;
  rawLabel: string;
  status: string;
  requestedBy: string | null;
  userId: string;
  createdAt: string;
}

export type BugStatus = "open" | "reviewing" | "resolved" | "wontfix";

export interface BugReport {
  id: string;
  title: string;
  body: string | null;
  context: Record<string, unknown>;
  status: BugStatus;
  reportedBy: string | null;
  userId: string | null;
  createdAt: string;
}

/** Tunable matchmaking weights (all optional; missing keys use defaults). */
export type MatchWeights = Record<string, number>;

/** A tunable weight's metadata for the admin UI. */
export interface WeightDef { key: string; label: string; def: number }

/** Per-signal outcome-learning stats (learning-to-rank, §5.4h). */
export interface LearningSignal {
  key: string;
  base: number;
  learned: number;
  multiplier: number;
  pos: number;
  neg: number;
  support: number;
}
export interface MatchLearningReport {
  signals: LearningSignal[];
  runs: number;
  feedbackCount: number;
  updatedAt: string | null;
}

// ── Staff system (roles / moderation / rewards) ──────────────────────────────
export type PlatformRole = "member" | "moderator" | "admin";
export type ReportKind = "post" | "drop" | "user" | "message";
export type ReportReason =
  | "spam" | "harassment" | "hate" | "nsfw" | "illegal" | "impersonation" | "misinformation" | "other";
export type ModAction = "dismiss" | "warn" | "hide" | "remove" | "escalate";

export interface ContentReport {
  id: string;
  targetKind: ReportKind;
  targetId: string;
  reason: ReportReason;
  detail: string | null;
  status: "open" | "resolved" | "dismissed";
  escalated: boolean;
  reporter: string | null;
  authorUsername: string | null;
  snippet: string | null;
  reportCount: number;
  handledBy: string | null;
  createdAt: string;
}

export interface StaffMember {
  userId: string;
  username: string | null;
  role: PlatformRole;
  points: number;
  resolved: number;
}

export interface StaffAction {
  id: string;
  actor: string | null;
  action: string;
  targetKind: string | null;
  targetId: string | null;
  note: string | null;
  points: number;
  at: string;
}

export interface ModStats {
  points: number;
  resolved: number;
  openReports: number;
  rank: number;
  recent: { action: string; points: number; at: string }[];
  leaderboard: { username: string | null; points: number; role: PlatformRole }[];
}

export interface ModApplicationRow {
  id: string;
  userId: string;
  username: string | null;
  pitch: string;
  experience: string | null;
  hoursPerWeek: number | null;
  timezone: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface MyModApplication {
  id: string;
  status: "pending" | "approved" | "rejected";
  pitch: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

// ── Cosmetics (Lane B store) ─────────────────────────────────────────────────
export type CosmeticCategory = "accent" | "flair";
export interface CosmeticData { c0?: string; c1?: string; label?: string; icon?: string; color?: string }
export interface Cosmetic { id: string; name: string; category: CosmeticCategory; price: number; data: CosmeticData }
export interface CosmeticStore {
  credits: number;
  equipped: Record<string, string>;
  owned: string[];
  catalog: Cosmetic[];
}

/** Payload for creating/updating a module (id omitted → create). */
export interface ModuleInput {
  id?: string;
  roleId: string;
  headline?: string | null;
  yearsExp?: number | null;
  collabStyle?: string | null;
  availability?: string | null;
  seeking?: SeekingIntent[];
  skill?: number | null;
  attrs?: Record<string, unknown>;
  portfolio?: PortfolioItem[];
}
