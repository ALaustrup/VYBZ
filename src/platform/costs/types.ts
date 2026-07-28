/** Provider spend mode — see docs/architecture/PROVIDER_ARCHITECTURE.md */
export type ProviderMode =
  | "disabled"
  | "free_only"
  | "prepaid_only"
  | "hard_cap"
  | "manual_approval"
  | "production";

export interface CostEstimate {
  provider: string;
  mode: ProviderMode;
  estimatedCents: number;
  currency: "USD";
  disabled: boolean;
  reason?: string;
}

export type CostReservationStatus =
  | "pending"
  | "held"
  | "reconciled"
  | "refunded"
  | "released";

export interface CostReservation {
  id: string;
  jobId: string;
  provider: string;
  estimatedCents: number;
  reservedCents: number;
  status: CostReservationStatus;
  createdAt: string;
}
