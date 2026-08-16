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
    detail: "Drop loops, oneshots and phrases. Upload starts immediately.",
  },
  {
    id: 1,
    label: "Metadata",
    short: "Tags",
    path: "/tools/metadata",
    detail: "Name the files. Leave blank what you do not know.",
  },
  {
    id: 2,
    label: "Artwork",
    short: "Art",
    path: "/tools/art-check",
    detail: "Grade or generate cover art. A drop still has no artwork field.",
  },
  {
    id: 3,
    label: "Analyze",
    short: "Scan",
    path: "/releases",
    detail: "Measure the audio. Findings are not a fake readiness score.",
  },
  {
    id: 4,
    label: "Findings + fix",
    short: "Fix",
    path: "/tools/correct",
    detail: "Read the findings. Apply reversible corrections to the master.",
  },
  {
    id: 5,
    label: "Pack",
    short: "Pack",
    path: "/tools/pack-maker",
    detail: "Assemble the measured ZIP. Samples stay out of the catalog.",
  },
  {
    id: 6,
    label: "Export",
    short: "Export",
    path: "/tools/packs/new",
    detail: "Download the ZIP or send it to a storefront draft.",
  },
  {
    id: 7,
    label: "Live",
    short: "Live",
    path: "/tools/packs",
    detail: "The listing is up. Buyers pay; the ZIP is mailed after payment.",
  },
  {
    id: 8,
    label: "Sales",
    short: "Sales",
    path: "/make/dashboard",
    detail: "Library counts and orders. Settlement is still manual.",
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
