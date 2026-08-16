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
    detail: "Drop the files. They start uploading now.",
  },
  {
    id: 1,
    label: "Names",
    short: "Names",
    path: "/tools/metadata",
    detail: "Title, artist, key. Blank is fine.",
  },
  {
    id: 2,
    label: "Cover",
    short: "Cover",
    path: "/tools/art-check",
    detail: "Check or make cover art.",
  },
  {
    id: 3,
    label: "Scan",
    short: "Scan",
    path: "/releases",
    detail: "We measure the audio. No fake score.",
  },
  {
    id: 4,
    label: "Fix",
    short: "Fix",
    path: "/tools/correct",
    detail: "See issues. Fix what you want.",
  },
  {
    id: 5,
    label: "Pack",
    short: "Pack",
    path: "/tools/pack-maker",
    detail: "Build the ZIP.",
  },
  {
    id: 6,
    label: "Export",
    short: "Export",
    path: "/tools/packs/new",
    detail: "Download it, or put it up for sale.",
  },
  {
    id: 7,
    label: "Live",
    short: "Live",
    path: "/tools/packs",
    detail: "It's up. Buyers get the ZIP by email.",
  },
  {
    id: 8,
    label: "Sales",
    short: "Sales",
    path: "/make/dashboard",
    detail: "Your files and what sold.",
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
