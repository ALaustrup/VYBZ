/** Honest availability for locally indexed work (PRODUCT.md §4). */
export type AssetAvailability =
  | "local-only"
  | "device-offline"
  | "available"
  | "shared"
  | "private";

export const AVAILABILITY_LABEL: Record<AssetAvailability, string> = {
  "local-only": "Local only",
  "device-offline": "Device offline",
  available: "Available",
  shared: "Shared",
  private: "Private",
};

export type CreatorNodeRecord = {
  id: string;
  name: string;
  indexedAt: number;
  fileCount: number;
  totalBytes: number;
  availability: AssetAvailability;
};

export type IndexedAssetRecord = {
  id: string;
  nodeId: string;
  relativePath: string;
  name: string;
  mime: string;
  sizeBytes: number;
  lastModified: number;
  availability: AssetAvailability;
};

export type WalkFile = {
  relativePath: string;
  name: string;
  sizeBytes: number;
  mime: string;
  lastModified: number;
};
