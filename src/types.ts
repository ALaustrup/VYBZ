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
