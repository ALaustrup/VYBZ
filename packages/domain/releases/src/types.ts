/**
 * Domain types for Release Projects — no platform or browser imports.
 */

export type ReleaseStatus = "draft" | "scanning" | "ready" | "blocked" | "archived";

export type FindingSeverity = "blocking" | "warning" | "info";

export type FindingCategory = "audio" | "artwork" | "metadata" | "package";

export type FindingStatus = "open" | "resolved" | "dismissed";

export type AssetKind = "audio" | "artwork";

export type ReleaseProject = {
  id: string;
  ownerId: string;
  title: string;
  artistName: string | null;
  status: ReleaseStatus;
  metadata: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ReleaseAsset = {
  id: string;
  releaseId: string;
  ownerId: string;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  probe: Record<string, unknown>;
  createdAt: string;
};

export type ReleaseFinding = {
  id: string;
  releaseId: string;
  ownerId: string;
  assetId: string | null;
  code: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  detail: string;
  status: FindingStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateReleaseInput = {
  ownerId: string;
  title: string;
  artistName?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateReleaseInput = {
  title?: string;
  artistName?: string | null;
  status?: ReleaseStatus;
  metadata?: Record<string, unknown>;
};

export type ReleaseBundle = {
  project: ReleaseProject;
  assets: ReleaseAsset[];
  findings: ReleaseFinding[];
};
