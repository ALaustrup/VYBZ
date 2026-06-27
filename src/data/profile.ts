import { OWN_CONFESSIONS } from "@/data/confessions";

// The current user is anonymous even to themselves — identity is an aesthetic,
// not a name. Aggregate analytics are derived from their own confessions.
export const PROFILE = {
  alias: "Obsidian Veil",
  handle: "@veiled_one",
  joined: "Joined this season",
  bio: "Collecting secrets. Returning none.",
  seed: 424242,
};

const totalFeels = OWN_CONFESSIONS.reduce((sum, c) => sum + c.feels, 0);
const totalWilds = OWN_CONFESSIONS.reduce((sum, c) => sum + c.wilds, 0);
const totalViews = OWN_CONFESSIONS.reduce((sum, c) => sum + c.views, 0);
const totalReveals = OWN_CONFESSIONS.reduce((sum, c) => sum + c.reveals, 0);

export const PROFILE_STATS = {
  confessions: OWN_CONFESSIONS.length,
  feels: totalFeels,
  wilds: totalWilds,
  views: totalViews,
  reveals: totalReveals,
  // How often a viewer cared enough to lift the veil.
  revealRate: totalViews ? Math.round((totalReveals / totalViews) * 100) : 0,
  // Share of reactions that were empathetic vs. shocked.
  feelShare: totalFeels + totalWilds
    ? Math.round((totalFeels / (totalFeels + totalWilds)) * 100)
    : 0,
};
