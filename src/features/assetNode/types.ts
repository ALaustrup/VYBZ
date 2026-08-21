/** Honest availability for locally indexed work (PRODUCT.md §4 / Phase 8). */
export type AssetAvailability =
  | "local-only"
  | "session-only"
  | "device-offline"
  | "unavailable"
  | "available"
  | "shared"
  | "private";

export const AVAILABILITY_LABEL: Record<AssetAvailability, string> = {
  "local-only": "Available now",
  "session-only": "While this app is open",
  "device-offline": "On another device",
  unavailable: "Unavailable here",
  available: "Available",
  shared: "Public",
  private: "Private",
};

/** The six states Phase 8 must communicate. */
export const MOBILE_AVAILABILITY_LEGEND = [
  { id: "local-only", meaning: "Readable on this device right now." },
  { id: "session-only", meaning: "Readable only while this app is open. Not a background host." },
  { id: "device-offline", meaning: "Stored on another linked device. Cloud has names and sizes only." },
  { id: "unavailable", meaning: "Indexed here, but the bytes are not reachable now." },
  { id: "shared", meaning: "Public media — published Works, not this private index." },
  { id: "private", meaning: "Private to you. Not shown as public media." },
] as const;

export type CreatorNodeRecord = {
  id: string;
  name: string;
  indexedAt: number;
  fileCount: number;
  totalBytes: number;
  availability: AssetAvailability;
  kind?: "web" | "desktop" | "android" | "ios";
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
