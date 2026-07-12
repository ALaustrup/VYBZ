// Shared constants + option resolution for the dynamic discipline modules.
import { GENRES, DAWS } from "@/lib/profileFields";
import type { DisciplineCategory, FieldDef, SeekingIntent } from "@/types";

/** What a creator is seeking in a discipline — shared across every module. */
export const SEEKING_INTENTS: { id: SeekingIntent; label: string; hint: string }[] = [
  { id: "paid", label: "Paid work", hint: "Commissions & gigs" },
  { id: "collab", label: "Creative collabs", hint: "Build something together" },
  { id: "mentorship", label: "Mentorship", hint: "Learn or teach" },
  { id: "cofounding", label: "Co-founding", hint: "A serious partnership" },
  { id: "spark", label: "Exploratory spark", hint: "See where it goes" },
];

export const COLLAB_STYLES: { id: string; label: string }[] = [
  { id: "async", label: "Async" },
  { id: "realtime", label: "Real-time" },
  { id: "structured", label: "Structured" },
  { id: "experimental", label: "Experimental" },
];

export const AVAILABILITY: { id: string; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "selective", label: "Selective" },
  { id: "busy", label: "Heads-down" },
];

export interface Opt { id: string; label: string }

/**
 * Resolve a field's `options` into a concrete list. Supports inline arrays and
 * named catalogs: "genres", "daws", and "roles:<category>" (from the loaded
 * discipline catalog).
 */
export function resolveOptions(field: FieldDef, cats: DisciplineCategory[]): Opt[] {
  const o = field.options;
  if (Array.isArray(o)) return o.map((x) => ({ id: x, label: x }));
  if (o === "genres") return GENRES.map((g) => ({ id: g, label: g }));
  if (o === "daws") return DAWS.map((d) => ({ id: d.id, label: d.label }));
  if (typeof o === "string" && o.startsWith("roles:")) {
    const catId = o.slice("roles:".length);
    const cat = cats.find((c) => c.id === catId);
    return (cat?.disciplines ?? []).map((d) => ({ id: d.id, label: d.label }));
  }
  return [];
}

/** Look up a discipline's display label across the loaded catalog. */
export function disciplineLabel(cats: DisciplineCategory[], roleId: string): string {
  for (const c of cats) {
    const d = c.disciplines.find((x) => x.id === roleId);
    if (d) return d.label;
  }
  return roleId;
}
