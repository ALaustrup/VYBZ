export type ProfilePerspective = "owner" | "visitor";

/**
 * One Stage File, two permission contexts.
 * Previewing as a visitor still uses the visitor surface, but social actions
 * never run against your own identity.
 */
export function profilePerspective(opts: {
  isOwner: boolean;
  asVisitor?: boolean;
}): ProfilePerspective {
  if (opts.isOwner && !opts.asVisitor) return "owner";
  return "visitor";
}

export function showOwnerControls(perspective: ProfilePerspective): boolean {
  return perspective === "owner";
}

/** Connect, Follow, Message, Tip, Report, Book — never on your own VYBZ. */
export function showVisitorSocial(isOwner: boolean): boolean {
  return !isOwner;
}

export function isVisitorPreview(viewParam: string | null | undefined): boolean {
  return viewParam === "visitor";
}
