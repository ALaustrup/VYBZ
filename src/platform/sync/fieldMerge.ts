/** Field-level diff / accept-mine / accept-theirs for credits & metadata. */

export type FieldDiff = {
  field: string;
  mine: unknown;
  theirs: unknown;
};

export function diffRecords(
  mine: Record<string, unknown>,
  theirs: Record<string, unknown>,
  fields: string[]
): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const field of fields) {
    const a = mine[field];
    const b = theirs[field];
    if (!Object.is(a, b) && JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ field, mine: a, theirs: b });
    }
  }
  return out;
}

/** Auto-merge independent fields: take mine where set, else theirs. */
export function autoMergeIndependent(
  base: Record<string, unknown>,
  mine: Record<string, unknown>,
  theirs: Record<string, unknown>,
  fields: string[]
): { merged: Record<string, unknown>; conflicts: FieldDiff[] } {
  const merged = { ...base };
  const conflicts: FieldDiff[] = [];
  for (const field of fields) {
    const mChanged = !Object.is(mine[field], base[field]) && JSON.stringify(mine[field]) !== JSON.stringify(base[field]);
    const tChanged =
      !Object.is(theirs[field], base[field]) && JSON.stringify(theirs[field]) !== JSON.stringify(base[field]);
    if (mChanged && tChanged && JSON.stringify(mine[field]) !== JSON.stringify(theirs[field])) {
      conflicts.push({ field, mine: mine[field], theirs: theirs[field] });
      continue;
    }
    if (mChanged) merged[field] = mine[field];
    else if (tChanged) merged[field] = theirs[field];
  }
  return { merged, conflicts };
}

export function resolveAcceptMine<T extends Record<string, unknown>>(
  mine: T,
  theirs: T,
  fields: string[]
): T {
  const out = { ...theirs };
  for (const field of fields) {
    if (field in mine) (out as Record<string, unknown>)[field] = mine[field];
  }
  return out;
}

export function resolveAcceptTheirs<T extends Record<string, unknown>>(
  mine: T,
  theirs: T,
  fields: string[]
): T {
  const out = { ...mine };
  for (const field of fields) {
    if (field in theirs) (out as Record<string, unknown>)[field] = theirs[field];
  }
  return out;
}

export type ConflictChoice = "mine" | "theirs";

export function applyConflictChoice<T extends Record<string, unknown>>(
  choice: ConflictChoice,
  mine: T,
  theirs: T,
  fields: string[]
): T {
  return choice === "mine" ? resolveAcceptMine(mine, theirs, fields) : resolveAcceptTheirs(mine, theirs, fields);
}
