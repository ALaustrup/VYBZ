import type { Destination } from "@/app/routeTruth";

/**
 * The command palette's data layer.
 *
 * Everything here is pure so the two things most likely to be wrong — which
 * commands are offered, and which one a query selects — can be tested without
 * rendering anything.
 *
 * Honesty rules, from the owner's direction that no control may lead nowhere:
 *   · navigation commands are built only from verified-working destinations
 *   · a command that cannot run right now still appears, but says why
 *   · nothing is invented; every action maps to a real handler in the palette
 */

export type CommandGroup = "Go" | "Playback" | "Create";

export type Command = {
  id: string;
  title: string;
  group: CommandGroup;
  /** Matched by search but not displayed. */
  keywords?: string[];
  /** Set for navigation commands. */
  to?: string;
  /** When set, the command is listed but disabled, and this is shown as the reason. */
  unavailableReason?: string;
};

export type CommandContext = {
  /** Already filtered for feature flags by `availableDestinations`. */
  destinations: readonly Destination[];
  currentPath: string;
  hasTrack: boolean;
  playing: boolean;
  queueLength: number;
  queueIndex: number;
  canCompose: boolean;
  canGenerate: boolean;
  canBulkUpload: boolean;
};

const NOTHING_LOADED = "Nothing is loaded in the player";

export function buildCommands(ctx: CommandContext): Command[] {
  const go: Command[] = ctx.destinations.map((d) => ({
    id: `go:${d.path}`,
    title: d.title,
    group: "Go",
    keywords: d.keywords,
    to: d.path,
    unavailableReason: samePath(d.path, ctx.currentPath) ? "You are already here" : undefined,
  }));

  const atQueueEnd = ctx.queueIndex >= 0 && ctx.queueIndex >= ctx.queueLength - 1;

  const playback: Command[] = [
    {
      id: "player:toggle",
      title: ctx.playing ? "Pause" : "Play",
      group: "Playback",
      // Both words are always searchable. The title states what the command
      // will do, but a user reaches for the word they have in mind, which is
      // often the current state rather than the next one.
      keywords: ["play", "pause", "player", "resume", "stop"],
      unavailableReason: ctx.hasTrack ? undefined : NOTHING_LOADED,
    },
    {
      id: "player:next",
      title: "Next track",
      group: "Playback",
      keywords: ["skip", "forward"],
      unavailableReason: !ctx.hasTrack
        ? NOTHING_LOADED
        : atQueueEnd
          ? "This is the last track in the queue"
          : undefined,
    },
    {
      id: "player:prev",
      title: "Previous track",
      group: "Playback",
      keywords: ["back", "restart"],
      unavailableReason: ctx.hasTrack ? undefined : NOTHING_LOADED,
    },
    {
      id: "player:mute",
      title: "Toggle mute",
      group: "Playback",
      keywords: ["volume", "silence", "sound"],
      unavailableReason: ctx.hasTrack ? undefined : NOTHING_LOADED,
    },
  ];

  const create: Command[] = [
    {
      id: "create:drop",
      title: "New drop",
      group: "Create",
      keywords: ["upload", "track", "music video", "publish"],
      unavailableReason: ctx.canCompose ? undefined : "Not available on this screen",
    },
    {
      id: "create:generate",
      title: "Generate audio",
      group: "Create",
      keywords: ["stable", "audio", "prompt", "make", "worker"],
      unavailableReason: ctx.canGenerate ? undefined : "Not available on this screen",
    },
    {
      id: "create:batch",
      title: "Album or batch upload",
      group: "Create",
      keywords: ["bulk", "multiple", "masters", "upload"],
      unavailableReason: ctx.canBulkUpload ? undefined : "Not available on this screen",
    },
    {
      id: "create:node",
      title: "Index this device",
      group: "Create",
      keywords: ["node", "index", "folder", "catalog", "local"],
      to: "/library?tab=device",
    },
  ];

  return [...go, ...playback, ...create];
}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (p.replace(/\/+$/, "") || "/").toLowerCase();
  return norm(a) === norm(b);
}

/**
 * How well `text` answers `query`. 0 means no match.
 *
 * The ladder is deliberately coarse and ordered, so ranking is predictable to a
 * user typing: exact, then prefix, then the start of any word, then anywhere,
 * then scattered letters.
 */
export function scoreMatch(text: string, query: string): number {
  const t = text.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  if (!t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (new RegExp(`\\b${escapeRegex(q)}`).test(t)) return 65;
  if (t.includes(q)) return 45;
  return isSubsequence(t, q) ? 25 : 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSubsequence(text: string, query: string): boolean {
  let i = 0;
  for (const ch of text) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return false;
}

/** A command's score: its title, or its best keyword at a discount. */
export function scoreCommand(command: Command, query: string): number {
  const title = scoreMatch(command.title, query);
  let best = title;
  for (const k of command.keywords ?? []) {
    const s = scoreMatch(k, query) * 0.7;
    if (s > best) best = s;
  }
  // Nudge shorter titles ahead of longer ones at the same tier, so "Live" beats
  // "Visualizer tutorial" when both merely contain the query.
  return best > 0 ? best + Math.max(0, 12 - command.title.length) * 0.1 : 0;
}

/**
 * Commands matching `query`, best first.
 *
 * Ties keep registry order, so an empty query renders the deliberate grouping
 * rather than something alphabetical. Runnable commands always outrank
 * unavailable ones at the same score, so the palette never puts a dead entry
 * under the initial selection.
 */
export function rankCommands(commands: readonly Command[], query: string): Command[] {
  return commands
    .map((command, index) => ({ command, index, score: scoreCommand(command, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      const aDead = a.command.unavailableReason ? 1 : 0;
      const bDead = b.command.unavailableReason ? 1 : 0;
      if (aDead !== bDead) return aDead - bDead;
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((r) => r.command);
}
