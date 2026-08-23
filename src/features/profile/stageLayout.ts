import type { StageWork } from "./workKind";
import type { StageComposition } from "./stageComposition";

/** Existing Stage File sections the owner can rearrange. Identity chrome stays fixed. */
export const STAGE_MODULE_IDS = [
  "stage",
  "featured",
  "works",
  "story",
  "packs",
  "measured",
  "credits",
  "links",
] as const;

export type StageModuleId = (typeof STAGE_MODULE_IDS)[number];

export const DEFAULT_STAGE_MODULE_ORDER: StageModuleId[] = [...STAGE_MODULE_IDS];

export const STAGE_MODULE_SPAN: Record<StageModuleId, "wide" | "narrow"> = {
  stage: "wide",
  featured: "wide",
  works: "wide",
  story: "wide",
  packs: "wide",
  measured: "narrow",
  credits: "narrow",
  links: "narrow",
};

export const STAGE_MODULE_LABEL: Record<StageModuleId, string> = {
  stage: "Stage",
  featured: "Featured",
  works: "Works",
  story: "Story",
  packs: "Packs",
  measured: "Measured",
  credits: "Credits",
  links: "More",
};

export function isStageModuleId(value: string): value is StageModuleId {
  return (STAGE_MODULE_IDS as readonly string[]).includes(value);
}

/** Drop unknown ids, dedupe, append any missing modules in default order. */
export function parseStageModuleOrder(raw: unknown): StageModuleId[] {
  const incoming = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string").filter(isStageModuleId)
    : [];
  const seen = new Set<StageModuleId>();
  const out: StageModuleId[] = [];
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of DEFAULT_STAGE_MODULE_ORDER) {
    if (seen.has(id)) continue;
    out.push(id);
  }
  return out;
}

export function moveStageModule(
  order: StageModuleId[],
  id: StageModuleId,
  delta: -1 | 1,
): StageModuleId[] {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Place `fromId` immediately before `ontoId`. */
export function dropStageModule(
  order: StageModuleId[],
  fromId: string,
  ontoId: string,
): StageModuleId[] {
  if (!isStageModuleId(fromId) || !isStageModuleId(ontoId) || fromId === ontoId) return order;
  const next = order.filter((id) => id !== fromId);
  const onto = next.indexOf(ontoId);
  if (onto < 0) return order;
  next.splice(onto, 0, fromId);
  return parseStageModuleOrder(next);
}

export type StageModuleOccupancy = Record<StageModuleId, boolean>;

export function visibleStageModules(
  order: StageModuleId[],
  occupied: StageModuleOccupancy,
  arranging: boolean,
): StageModuleId[] {
  if (arranging) return order;
  return order.filter((id) => occupied[id]);
}

function collectDropIds(work: StageWork): string[] {
  const ids: string[] = [];
  if (work.drop?.id) ids.push(work.drop.id);
  else if (work.id.startsWith("drop:")) ids.push(work.id.slice("drop:".length));
  for (const item of work.items ?? []) ids.push(...collectDropIds(item));
  return ids;
}

export function featuredDropIdSet(
  composition: StageComposition,
  featuredDropId?: string | null,
): Set<string> {
  const ids = new Set(
    composition.placements.filter((p) => p.section === "featured").map((p) => p.dropId),
  );
  if (featuredDropId) ids.add(featuredDropId);
  return ids;
}

/** Featured is its own module. Works keeps everything else. */
export function partitionStageWorks(
  works: StageWork[],
  composition: StageComposition,
  featuredDropId?: string | null,
): { featured: StageWork[]; rest: StageWork[] } {
  const featuredIds = featuredDropIdSet(composition, featuredDropId);
  if (featuredIds.size === 0) return { featured: [], rest: works };
  const featured: StageWork[] = [];
  const rest: StageWork[] = [];
  for (const work of works) {
    const hit = collectDropIds(work).some((id) => featuredIds.has(id));
    if (hit) featured.push(work);
    else rest.push(work);
  }
  return { featured, rest };
}
