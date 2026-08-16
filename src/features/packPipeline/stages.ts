/**
 * The producer pack pipeline — nine stages, existing desks.
 *
 * This is the default experience (PRODUCT.md v2). Individual desks stay on
 * their own routes and are not deleted. The pipeline only sequences them.
 */

export type PackStageId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PackStage = {
  id: PackStageId;
  label: string;
  short: string;
  path: string;
  /** What this stage does, in one honest line. */
  detail: string;
};

export const PACK_STAGES: readonly PackStage[] = [
  {
    id: 0,
    label: "Upload",
    short: "Upload",
    path: "/make",
    detail: "Drop the audio. Bytes move while you stay on this step.",
  },
  {
    id: 1,
    label: "Metadata",
    short: "Tags",
    path: "/tools/metadata",
    detail: "Fix titles, artist, album, tempo and key. Empty stays empty.",
  },
  {
    id: 2,
    label: "Artwork",
    short: "Art",
    path: "/tools/art-check",
    detail: "Check or create cover art. A pack has no art field on the drop itself.",
  },
  {
    id: 3,
    label: "Analyze",
    short: "Scan",
    path: "/releases",
    detail: "Scan the assets. Findings are measured, not scored into a fake grade.",
  },
  {
    id: 4,
    label: "Fix",
    short: "Fix",
    path: "/tools/correct",
    detail: "See the findings and run reversible corrections on the master.",
  },
  {
    id: 5,
    label: "Pack",
    short: "Pack",
    path: "/tools/pack-maker",
    detail: "Assemble loops and oneshots into a measured ZIP and manifest.",
  },
  {
    id: 6,
    label: "Publish",
    short: "Export",
    path: "/tools/packs/new",
    detail: "Download the ZIP or hand it to the storefront draft.",
  },
  {
    id: 7,
    label: "Live",
    short: "Live",
    path: "/tools/packs",
    detail: "The listing is published. Buyers pay; the ZIP is mailed after payment.",
  },
  {
    id: 8,
    label: "Sales",
    short: "Sales",
    path: "/make/dashboard",
    detail: "Library plus orders. Settlement is still manual until payouts are verified.",
  },
] as const;

export function stageById(id: number): PackStage | undefined {
  return PACK_STAGES.find((s) => s.id === id);
}

export function stageByPath(pathname: string): PackStage | undefined {
  const exact = PACK_STAGES.find((s) => s.path === pathname);
  if (exact) return exact;
  // Editor for an existing pack is still "publish / live".
  if (pathname.startsWith("/tools/packs/")) {
    return pathname.endsWith("/new") ? stageById(6) : stageById(7);
  }
  if (pathname.startsWith("/releases") || pathname.startsWith("/release/")) {
    return stageById(3);
  }
  return undefined;
}

export function isPackPipelinePath(pathname: string): boolean {
  return stageByPath(pathname) != null;
}
