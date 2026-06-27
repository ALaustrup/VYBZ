// Confession Battles: two veiled confessions go head-to-head and the crowd
// votes with their reactions.
export interface Battle {
  id: string;
  prompt: string;
  a: string; // confession id
  b: string; // confession id
  votesA: number;
  votesB: number;
}

// MYVYB starts brand new — no seeded battles (they referenced demo posts).
export const BATTLES: Battle[] = [];
