/**
 * Perception Engine contracts — product IP.
 * Observations only; never implementation instructions.
 */

export type SourceType = "web" | "audio" | "image" | "manual" | "system";

export type Severity = "info" | "notice" | "attention" | "blocking";

export type Confidence = "high" | "medium" | "low";

export type Lifecycle = "new" | "seen" | "regressed" | "resolved" | "stale";

export type MediaKind = "web" | "audio" | "image" | "cross";

/** Detector provenance — required on every observation and edge. */
export interface Origin {
  /** Stable detector name, e.g. web.page-chrome */
  detector: string;
  /** Semver of the detector contract */
  version: string;
  sourceType: SourceType;
}

/** Evidence refs only — no large blobs in the observation record. */
export interface Evidence {
  screenshotPath?: string;
  /** Truncated DOM/text sample */
  bodySample?: string;
  url?: string;
  note?: string;
}

/**
 * Reserved entity handle (Phase 2: type + docs only).
 * Observations may later set `entityId` when the entity layer is authorised.
 * Do not invent entity graphs in this milestone.
 */
export interface PerceptionEntity {
  id: string;
  kind: "project" | "release" | "stem" | "surface" | "media" | "unknown";
  label?: string;
}

export interface Observation {
  id: string;
  surface: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  evidence: Evidence;
  lifecycle: Lifecycle;
  summary: string;
  origin: Origin;
  firstSeenRun: string;
  lastSeenRun: string;
  /** App / build SHA when known; otherwise "Not measured" */
  appSha: string;
  /**
   * Reserved: attach to a PerceptionEntity later.
   * Leave undefined until the entity layer is authorised.
   */
  entityId?: string;
}

/** Draft before catalog assigns lifecycle / first-seen. */
export type ObservationDraft = Omit<
  Observation,
  "lifecycle" | "firstSeenRun" | "lastSeenRun" | "appSha"
> & {
  lifecycle?: Lifecycle;
  firstSeenRun?: string;
  lastSeenRun?: string;
  appSha?: string;
};

export type PerceptionRelation =
  | "depends_on"
  | "contains"
  | "same_as"
  | "derived_from"
  | "stem_of"
  | "related_media"
  | "blocks"
  | "relates_to";

export interface PerceptionEdge {
  id: string;
  from: string;
  to: string;
  relation: PerceptionRelation;
  confidence: Confidence;
  origin: Origin;
}

export type PerceptionEdgeDraft = Omit<PerceptionEdge, "id"> & { id?: string };

export interface ModuleCollectResult {
  observations: ObservationDraft[];
  edges: PerceptionEdgeDraft[];
}
