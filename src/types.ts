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
  banned: boolean;
  profile: ProfileDetails;
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

// ── Admin console ────────────────────────────────────────────────────────────
export interface AdminMember {
  userId: string;
  username: string | null;
  location: string | null;
  isAdmin: boolean;
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
