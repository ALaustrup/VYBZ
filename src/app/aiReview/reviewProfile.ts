import type { Profile } from "@/types";

/** Fixed non-admin alpha member for the AI review portal. */
export const AI_REVIEW_PROFILE: Profile = {
  id: "00000000-0000-4000-a000-0000000000ai",
  username: "aireviewer",
  displayName: "AI Reviewer (fixture)",
  avatarUrl: null,
  bio: "Read-only fixture profile for engineering AI review. Not a live account.",
  location: null,
  musicUrl: null,
  identityPublic: true,
  isAdmin: false,
  platformRole: "member",
  modPoints: 0,
  equippedCosmetics: {},
  banned: false,
  alphaAccessAt: "2026-08-01T00:00:00.000Z",
  passwordLockedAt: "2026-08-01T00:00:00.000Z",
  profile: {},
  featuredDropId: null,
  createdAt: Date.parse("2026-08-01T00:00:00.000Z"),
};
