import type { Confession, OwnConfession } from "@/types";

// MYVYB ships with NO seeded/demo content — the platform starts brand new and
// shows only genuine, user-created posts. These exports remain (empty) so the
// components that import them keep working without a fallback wall of fixtures.
export const CONFESSIONS: Confession[] = [];

// The current user's own posts are loaded live from the backend; no fixtures.
export const OWN_CONFESSIONS: OwnConfession[] = [];
