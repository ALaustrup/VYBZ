import { describe, expect, it } from "vitest";
import {
  type CommandContext,
  buildCommands,
  rankCommands,
  scoreCommand,
  scoreMatch,
} from "@/shell/commands";
import { availableDestinations, isPlaceholderPath } from "@/app/routeTruth";

function ctx(over: Partial<CommandContext> = {}): CommandContext {
  return {
    destinations: availableDestinations({ storefront: true }),
    currentPath: "/",
    hasTrack: true,
    playing: false,
    queueLength: 3,
    queueIndex: 0,
    canCompose: true,
    canBulkUpload: true,
    ...over,
  };
}

describe("command registry", () => {
  it("offers no command that leads to a placeholder", () => {
    const dead = buildCommands(ctx())
      .filter((c) => c.to)
      .filter((c) => isPlaceholderPath(c.to!));
    expect(dead.map((c) => c.to)).toEqual([]);
  });

  it("gives every command a unique id", () => {
    const ids = buildCommands(ctx()).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks the current destination as already reached rather than hiding it", () => {
    const here = buildCommands(ctx({ currentPath: "/library" })).find((c) => c.to === "/library");
    expect(here?.unavailableReason).toBe("You are already here");
  });

  it("treats a trailing slash as the same destination", () => {
    const here = buildCommands(ctx({ currentPath: "/library/" })).find((c) => c.to === "/library");
    expect(here?.unavailableReason).toBe("You are already here");
  });

  it("names the play command for what it will do", () => {
    const paused = buildCommands(ctx({ playing: false })).find((c) => c.id === "player:toggle");
    const playing = buildCommands(ctx({ playing: true })).find((c) => c.id === "player:toggle");
    expect(paused?.title).toBe("Play");
    expect(playing?.title).toBe("Pause");
  });

  it("explains why playback is unavailable with an empty player", () => {
    const cmds = buildCommands(ctx({ hasTrack: false }));
    for (const id of ["player:toggle", "player:next", "player:prev", "player:mute"]) {
      expect(cmds.find((c) => c.id === id)?.unavailableReason).toBe(
        "Nothing is loaded in the player",
      );
    }
  });

  it("disables Next at the end of the queue and explains it", () => {
    const end = buildCommands(ctx({ queueIndex: 2, queueLength: 3 }));
    expect(end.find((c) => c.id === "player:next")?.unavailableReason).toBe(
      "This is the last track in the queue",
    );
    expect(end.find((c) => c.id === "player:prev")?.unavailableReason).toBeUndefined();
  });

  it("disables creation when the screen provides no handler", () => {
    const cmds = buildCommands(ctx({ canCompose: false, canBulkUpload: false }));
    expect(cmds.find((c) => c.id === "create:drop")?.unavailableReason).toBe(
      "Not available on this screen",
    );
    expect(cmds.find((c) => c.id === "create:batch")?.unavailableReason).toBe(
      "Not available on this screen",
    );
  });

  it("drops flag-gated destinations when the flag is off", () => {
    const off = buildCommands(ctx({ destinations: availableDestinations({ storefront: false }) }));
    expect(off.some((c) => c.to === "/tools/packs")).toBe(false);
  });
});

describe("scoreMatch", () => {
  it("ranks exact above prefix above word-start above contains above scattered", () => {
    expect(scoreMatch("library", "library")).toBeGreaterThan(scoreMatch("library", "libr"));
    expect(scoreMatch("library", "libr")).toBeGreaterThan(scoreMatch("my library", "libr"));
    expect(scoreMatch("my library", "libr")).toBeGreaterThan(scoreMatch("mylibrary", "ibrar"));
    expect(scoreMatch("mylibrary", "ibrar")).toBeGreaterThan(scoreMatch("library", "lry"));
  });

  it("returns zero when the letters are not all present in order", () => {
    expect(scoreMatch("library", "xyz")).toBe(0);
    expect(scoreMatch("library", "yrarbil")).toBe(0);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(scoreMatch("Library", "  LIBRARY ")).toBe(100);
  });

  it("treats an empty query as neutral rather than as no match", () => {
    expect(scoreMatch("anything", "")).toBeGreaterThan(0);
  });

  it("does not let regex characters in a query throw", () => {
    expect(() => scoreMatch("cost sentinel", "c(o")).not.toThrow();
    expect(scoreMatch("cost sentinel", "c(o")).toBe(0);
  });

  it("scores a keyword below an equally good title match", () => {
    const byTitle = { id: "a", title: "Store", group: "Go" as const };
    const byKeyword = { id: "b", title: "Wallet things", group: "Go" as const, keywords: ["store"] };
    expect(scoreCommand(byTitle, "store")).toBeGreaterThan(scoreCommand(byKeyword, "store"));
  });
});

describe("rankCommands", () => {
  const all = buildCommands(ctx());

  it("finds the library by prefix", () => {
    expect(rankCommands(all, "lib")[0]?.to).toBe("/library");
  });

  it("finds a destination through a keyword the title does not contain", () => {
    expect(rankCommands(all, "readiness")[0]?.to).toBe("/releases/new");
  });

  it("returns everything for an empty query, in registry order", () => {
    const ranked = rankCommands(all, "");
    expect(ranked).toHaveLength(all.length);
    expect(ranked[0]?.group).toBe("Go");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(rankCommands(all, "zzzzqqqq")).toEqual([]);
  });

  it("never puts an unavailable command first when a runnable one matches", () => {
    // On /store, "Store" is an exact match but unavailable, while "Storefront"
    // is a weaker match that actually goes somewhere. The runnable one leads.
    const onStore = buildCommands(ctx({ currentPath: "/store" }));
    const ranked = rankCommands(onStore, "store");
    expect(ranked[0]?.to).toBe("/tools/packs");
    expect(ranked[0]?.unavailableReason).toBeUndefined();
    expect(scoreCommand(ranked[1]!, "store")).toBeGreaterThan(scoreCommand(ranked[0]!, "store"));
  });

  it("only ranks by availability among commands that match at all", () => {
    // A query matching a single unavailable command still returns it, rather
    // than hiding the destination the user asked for.
    const onLibrary = buildCommands(ctx({ currentPath: "/library" }));
    const ranked = rankCommands(onLibrary, "librar");
    expect(ranked.map((c) => c.to)).toEqual(["/library"]);
  });

  it("still lists the unavailable command so the reason is visible", () => {
    const onLibrary = buildCommands(ctx({ currentPath: "/library" }));
    const ranked = rankCommands(onLibrary, "library");
    expect(ranked.some((c) => c.unavailableReason === "You are already here")).toBe(true);
  });

  it("matches playback by intent", () => {
    expect(rankCommands(all, "pause")[0]?.id).toBe("player:toggle");
    expect(rankCommands(all, "volume")[0]?.id).toBe("player:mute");
  });
});
