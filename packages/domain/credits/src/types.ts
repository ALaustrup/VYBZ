/** Credits domain types — no platform / browser imports. */

export type CreditRole =
  | "primary_artist"
  | "featured"
  | "producer"
  | "composer"
  | "songwriter"
  | "lyricist"
  | "mixer"
  | "engineer"
  | "mastering"
  | "other";

export type CreditStatus = "draft" | "confirmed" | "disputed";

export type CreditSource = "manual" | "audio_metadata" | "import";

export type ReleaseCredit = {
  id: string;
  releaseId: string;
  ownerId: string;
  displayName: string;
  role: CreditRole;
  splitBps: number | null;
  status: CreditStatus;
  source: CreditSource;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateCreditInput = {
  releaseId: string;
  ownerId: string;
  displayName: string;
  role: CreditRole;
  splitBps?: number | null;
  status?: CreditStatus;
  source?: CreditSource;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type UpdateCreditInput = {
  displayName?: string;
  role?: CreditRole;
  splitBps?: number | null;
  status?: CreditStatus;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export const CREDIT_ROLES: CreditRole[] = [
  "primary_artist",
  "featured",
  "producer",
  "composer",
  "songwriter",
  "lyricist",
  "mixer",
  "engineer",
  "mastering",
  "other",
];
