// Ephemeral, evocative anonymous aliases — the only "identity" MYVYB needs.

const ADJECTIVES = [
  "Velvet", "Crimson", "Hollow", "Neon", "Soft", "Glass", "Midnight", "Ash",
  "Static", "Quiet", "Marble", "Cobalt", "Feral", "Opal", "Lunar", "Paper",
  "Iron", "Pale", "Tin", "Obsidian", "Gilded", "Wax", "Amber", "Slate",
];

const NOUNS = [
  "Ghost", "Moon", "Saint", "Wolf", "Cathedral", "Vandal", "Bloom", "Halo",
  "Riot", "Wraith", "Sermon", "Lullaby", "Mutiny", "Tide", "Crane", "Ember",
  "Comet", "Carillon", "Veil", "Echo", "Harbor", "Oracle", "Cinder", "Wren",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a two-word alias like "Velvet Ghost". */
export function generateAlias(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
