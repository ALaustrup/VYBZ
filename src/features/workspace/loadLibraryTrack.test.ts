import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeLibraryTrackFailure,
  libraryTrackExtension,
  libraryTrackFileName,
  libraryTrackMimeType,
  loadAlbumIntoWorkingSet,
  loadLibraryTrackIntoWorkingSet,
  pickAlbumLeadTrack,
  type LibraryTrackLoadFailure,
  type LibraryTrackLoadPhase,
} from "@/features/workspace/loadLibraryTrack";
import { getWorkingTrack, resetWorkingTrack } from "@/features/workspace/workingSet";
import type { Drop } from "@/types";

const resolveAudioUrl = vi.fn<(u: string | null | undefined) => Promise<string | null>>();
const dropsByIds = vi.fn<(ids: string[]) => Promise<Drop[]>>();

// api.ts is the whole data layer; the loader only needs these two, and mocking
// them keeps this a unit test rather than a Supabase integration.
vi.mock("@/lib/api", () => ({
  resolveAudioUrl: (u: string | null | undefined) => resolveAudioUrl(u),
  dropsByIds: (ids: string[]) => dropsByIds(ids),
}));

function drop(over: Partial<Drop> = {}): Drop {
  return {
    id: "drop-1",
    authorId: "user-a",
    authorUsername: "ada",
    title: "Neon Rain",
    body: null,
    seed: 42,
    feels: 0,
    wilds: 0,
    createdAt: Date.UTC(2026, 7, 1),
    assetId: "asset-1",
    audioUrl: "https://cdn.example.com/u/drops/master.wav?token=abc",
    audioFormat: "WAV",
    ...over,
  };
}

function lastPhase(phases: LibraryTrackLoadPhase[]): LibraryTrackLoadPhase | undefined {
  return phases[phases.length - 1];
}

function response(body: string, init: { ok?: boolean; type?: string } = {}) {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: init.ok ?? true,
    headers: new Headers({
      "content-type": init.type ?? "audio/wav",
      "content-length": String(bytes.byteLength),
    }),
    // jsdom's fetch has no streaming body, so the loader's non-streaming path
    // is the one that actually runs in the browser tests too.
    body: null,
    blob: async () => new Blob([bytes], { type: init.type ?? "audio/wav" }),
  } as unknown as Response;
}

beforeEach(() => {
  resetWorkingTrack();
  resolveAudioUrl.mockReset();
  dropsByIds.mockReset();
  resolveAudioUrl.mockImplementation(async (u) => u ?? null);
  dropsByIds.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetWorkingTrack();
});

describe("libraryTrackExtension", () => {
  it("prefers what the server actually sent over what was recorded at upload", () => {
    const d = drop({ audioFormat: "WAV" });
    expect(libraryTrackExtension(d, { contentType: "audio/mpeg" })).toBe("mp3");
  });

  it("ignores the charset parameter on a content type", () => {
    expect(libraryTrackExtension(drop(), { contentType: "audio/flac; charset=binary" })).toBe("flac");
  });

  it("falls back to the stored format when the server says nothing useful", () => {
    expect(
      libraryTrackExtension(drop({ audioFormat: "FLAC" }), { contentType: "application/octet-stream" })
    ).toBe("flac");
  });

  it("falls back to the stored object's own name, ignoring the query string", () => {
    expect(
      libraryTrackExtension(drop({ audioFormat: null }), {
        contentType: null,
        url: "https://cdn.example.com/u/drops/master.aiff?token=abc&expires=1",
      })
    ).toBe("aiff");
  });

  it("omits the extension rather than guessing when nothing measured answers", () => {
    expect(
      libraryTrackExtension(drop({ audioFormat: null }), {
        contentType: null,
        url: "https://cdn.example.com/u/drops/9f3b1c",
      })
    ).toBeNull();
  });

  it("does not accept an unknown extension from a URL", () => {
    expect(
      libraryTrackExtension(drop({ audioFormat: null }), { url: "https://x.test/master.txt" })
    ).toBeNull();
  });
});

describe("libraryTrackFileName", () => {
  it("makes a filesystem-safe name from the title", () => {
    expect(libraryTrackFileName(drop({ title: "Neon Rain / pt.2" }), "wav")).toBe("Neon_Rain_pt.2.wav");
  });

  it("falls back to a neutral name when there is no title", () => {
    expect(libraryTrackFileName(drop({ title: null }), "wav")).toBe("track.wav");
    expect(libraryTrackFileName(drop({ title: "   " }), null)).toBe("track");
  });

  it("leaves the extension off when none was determined", () => {
    expect(libraryTrackFileName(drop({ title: "Loop" }), null)).toBe("Loop");
  });

  it("keeps names bounded so a long title cannot produce an unusable file", () => {
    const name = libraryTrackFileName(drop({ title: "x".repeat(200) }), "wav");
    expect(name.length).toBeLessThanOrEqual(52);
    expect(name.endsWith(".wav")).toBe(true);
  });
});

describe("libraryTrackMimeType", () => {
  it("uses the served type when it says something", () => {
    expect(libraryTrackMimeType("audio/flac", "wav")).toBe("audio/flac");
  });

  it("treats a generic binary type as no answer and maps the extension instead", () => {
    expect(libraryTrackMimeType("application/octet-stream", "mp3")).toBe("audio/mpeg");
  });

  it("returns empty rather than inventing a type nothing measured", () => {
    expect(libraryTrackMimeType(null, null)).toBe("");
  });
});

describe("pickAlbumLeadTrack", () => {
  it("skips tracks that have no audio", () => {
    const silent = drop({ id: "a", audioUrl: undefined });
    const playable = drop({ id: "b" });
    expect(pickAlbumLeadTrack([silent, playable])?.id).toBe("b");
  });

  it("returns null for an empty album", () => {
    expect(pickAlbumLeadTrack([])).toBeNull();
  });
});

describe("describeLibraryTrackFailure", () => {
  it("gives every failure its own readable sentence", () => {
    const reasons: LibraryTrackLoadFailure[] = [
      "no-audio",
      "rejected",
      "network",
      "stalled",
      "cancelled",
    ];
    const messages = reasons.map(describeLibraryTrackFailure);
    for (const m of messages) expect(m.length).toBeGreaterThan(10);
    expect(new Set(messages).size).toBe(reasons.length);
  });
});

describe("loadLibraryTrackIntoWorkingSet", () => {
  it("seeds the working set from the Library, tagged as such", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response("RIFFmaster")));
    const ok = await loadLibraryTrackIntoWorkingSet(drop({ creditedArtist: "Ada Lovelace" }));

    expect(ok).toBe(true);
    const working = getWorkingTrack();
    expect(working?.source).toBe("library");
    expect(working?.dropId).toBe("drop-1");
    expect(working?.fileName).toBe("Neon_Rain.wav");
    expect(working?.artistName).toBe("Ada Lovelace");
    expect(working?.blob.size).toBeGreaterThan(0);
  });

  it("reports a resolved then loaded phase the caller can show", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response("RIFFmaster")));
    const phases: LibraryTrackLoadPhase[] = [];
    await loadLibraryTrackIntoWorkingSet(drop(), { onPhase: (p) => phases.push(p) });

    expect(phases[0]).toEqual({ phase: "resolving" });
    expect(lastPhase(phases)).toMatchObject({ phase: "loaded" });
  });

  it("re-signs through the drop loader when the row carries no audio URL", async () => {
    dropsByIds.mockResolvedValue([drop({ audioUrl: "https://cdn.example.com/fresh.wav" })]);
    vi.stubGlobal("fetch", vi.fn(async () => response("RIFFmaster")));

    const ok = await loadLibraryTrackIntoWorkingSet(drop({ audioUrl: undefined }));

    expect(ok).toBe(true);
    expect(dropsByIds).toHaveBeenCalledWith(["drop-1"]);
  });

  it("fails with a reason rather than throwing when there is no audio at all", async () => {
    const phases: LibraryTrackLoadPhase[] = [];
    const ok = await loadLibraryTrackIntoWorkingSet(drop({ audioUrl: undefined, assetId: null }), {
      onPhase: (p) => phases.push(p),
    });

    expect(ok).toBe(false);
    expect(lastPhase(phases)).toEqual({ phase: "failed", reason: "no-audio" });
    expect(getWorkingTrack()).toBeNull();
  });

  it("reports a refusal separately from a dead connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response("nope", { ok: false })));
    const rejected: LibraryTrackLoadPhase[] = [];
    expect(
      await loadLibraryTrackIntoWorkingSet(drop(), { onPhase: (p) => rejected.push(p) })
    ).toBe(false);
    expect(lastPhase(rejected)).toEqual({ phase: "failed", reason: "rejected" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    const dead: LibraryTrackLoadPhase[] = [];
    expect(await loadLibraryTrackIntoWorkingSet(drop(), { onPhase: (p) => dead.push(p) })).toBe(false);
    expect(lastPhase(dead)).toEqual({ phase: "failed", reason: "network" });
  });

  it("stops before fetching when the caller has already cancelled", async () => {
    const fetchSpy = vi.fn(async () => response("RIFFmaster"));
    vi.stubGlobal("fetch", fetchSpy);
    const controller = new AbortController();
    controller.abort();

    const ok = await loadLibraryTrackIntoWorkingSet(drop(), { signal: controller.signal });

    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getWorkingTrack()).toBeNull();
  });
});

describe("loadAlbumIntoWorkingSet", () => {
  it("opens the lead track and says which one it was", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response("RIFFmaster")));
    const res = await loadAlbumIntoWorkingSet([
      drop({ id: "a", title: "Intro", audioUrl: undefined }),
      drop({ id: "b", title: "Second" }),
    ]);

    expect(res.ok).toBe(true);
    expect(res.track?.id).toBe("b");
    expect(getWorkingTrack()?.dropId).toBe("b");
  });

  it("fails cleanly on an empty album", async () => {
    const res = await loadAlbumIntoWorkingSet([]);
    expect(res).toEqual({ ok: false, track: null });
  });
});
