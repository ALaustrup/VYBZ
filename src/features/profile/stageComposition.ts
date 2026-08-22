import type { Drop, ProfileDetails } from "@/types";

/** Honest Stage File destinations for a Library work. Layout editing is later (Phase 6). */
export const PROFILE_SECTIONS = ["works", "featured"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export const SECTION_LABEL: Record<ProfileSection, string> = {
  works: "Works",
  featured: "Featured",
};

export type StagePlacement = {
  dropId: string;
  section: ProfileSection;
  sort: number;
};

export type StageComposition = {
  /**
   * False / missing: legacy — every catalog drop still appears on the Stage File.
   * True: only placed ids appear. New library files stay private until placed.
   */
  selected: boolean;
  placements: StagePlacement[];
};

export function parseStageComposition(details: ProfileDetails | undefined | null): StageComposition {
  const raw = details?.stageComposition;
  if (!raw || typeof raw !== "object") return { selected: false, placements: [] };
  const selected = raw.selected === true;
  const placements = Array.isArray(raw.placements)
    ? raw.placements
        .map((row, i) => normalizePlacement(row, i))
        .filter((p): p is StagePlacement => p != null)
    : [];
  return { selected, placements: dedupePlacements(placements) };
}

function normalizePlacement(row: unknown, fallbackSort: number): StagePlacement | null {
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const dropId = typeof rec.dropId === "string" ? rec.dropId.trim() : "";
  if (!dropId) return null;
  const section = rec.section === "featured" ? "featured" : "works";
  const sort = typeof rec.sort === "number" && Number.isFinite(rec.sort) ? rec.sort : fallbackSort;
  return { dropId, section, sort };
}

function dedupePlacements(placements: StagePlacement[]): StagePlacement[] {
  const seen = new Set<string>();
  const out: StagePlacement[] = [];
  for (const p of [...placements].sort((a, b) => a.sort - b.sort)) {
    if (seen.has(p.dropId)) continue;
    seen.add(p.dropId);
    out.push(p);
  }
  return out.map((p, i) => ({ ...p, sort: i }));
}

export function isComposed(c: StageComposition): boolean {
  return c.selected;
}

export function placedDropIds(c: StageComposition): Set<string> {
  return new Set(c.placements.map((p) => p.dropId));
}

export function isOnStage(c: StageComposition, dropId: string, featuredDropId?: string | null): boolean {
  if (featuredDropId && featuredDropId === dropId) return true;
  if (!c.selected) return true;
  return c.placements.some((p) => p.dropId === dropId);
}

export function sectionFor(c: StageComposition, dropId: string, featuredDropId?: string | null): ProfileSection | null {
  if (featuredDropId === dropId) return "featured";
  const hit = c.placements.find((p) => p.dropId === dropId);
  return hit?.section ?? (c.selected ? null : "works");
}

/**
 * First compose snapshots the ids already on the Stage File so existing
 * public work does not vanish. After that, only Place / Hide change the set.
 * New library files are not in the snapshot, so they stay off the Stage File
 * until placed — one library, no second catalog.
 */
export function placeDrops(
  current: StageComposition,
  dropIds: string[],
  section: ProfileSection,
  snapshotIds: string[] = [],
): StageComposition {
  const incoming = uniqueIds(dropIds);
  if (!incoming.length) return current;

  const base = current.selected ? current.placements : snapshotIds.map((id, i) => ({
    dropId: id,
    section: "works" as const,
    sort: i,
  }));

  const byId = new Map(base.map((p) => [p.dropId, p]));
  let nextSort = base.reduce((m, p) => Math.max(m, p.sort + 1), 0);
  for (const id of incoming) {
    const existing = byId.get(id);
    if (existing) {
      byId.set(id, { ...existing, section });
    } else {
      byId.set(id, { dropId: id, section, sort: nextSort++ });
    }
  }
  return { selected: true, placements: dedupePlacements([...byId.values()]) };
}

export function hideDrops(
  current: StageComposition,
  dropIds: string[],
  snapshotIds: string[] = [],
): StageComposition {
  const hide = new Set(uniqueIds(dropIds));
  if (!hide.size) return current;
  const base = current.selected
    ? current.placements
    : snapshotIds.map((id, i) => ({ dropId: id, section: "works" as const, sort: i }));
  return {
    selected: true,
    placements: dedupePlacements(base.filter((p) => !hide.has(p.dropId))),
  };
}

/** Stage File drops: legacy pass-through, or only placed (+ featured pin). */
export function applyDropComposition(
  drops: Drop[],
  composition: StageComposition,
  featuredDropId?: string | null,
): Drop[] {
  if (!composition.selected) return drops;
  const allowed = placedDropIds(composition);
  if (featuredDropId) allowed.add(featuredDropId);
  const rank = new Map(composition.placements.map((p) => [p.dropId, p.sort]));
  if (featuredDropId && !rank.has(featuredDropId)) rank.set(featuredDropId, -1);
  return drops
    .filter((d) => allowed.has(d.id))
    .sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999) || a.id.localeCompare(b.id));
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
