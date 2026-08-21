export function canFollowCreator(input: {
  viewerId: string | null;
  creatorId: string;
}): { ok: boolean; reason?: string } {
  if (!input.viewerId) return { ok: false, reason: "Sign in to follow." };
  if (input.viewerId === input.creatorId) return { ok: false, reason: "You already have this workspace." };
  return { ok: true };
}
