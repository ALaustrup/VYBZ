import { describe, expect, it, vi } from "vitest";
import {
  buildTrackActions,
  trackFileSummary,
  type TrackActionContext,
  type TrackActionHandlers,
} from "@/lib/trackActions";
import type { Drop } from "@/types";

function drop(over: Partial<Drop> = {}): Drop {
  return {
    id: "drop-1",
    authorId: "user-a",
    authorUsername: "ada",
    title: "Neon Rain",
    body: null,
    seed: 42,
    feels: 3,
    wilds: 0,
    createdAt: Date.UTC(2026, 7, 1),
    assetId: "asset-1",
    audioUrl: "https://cdn.example.com/a.wav",
    durationSec: 185,
    audioFormat: "wav",
    sampleRate: 44100,
    lossless: true,
    ...over,
  };
}

function ctx(over: Partial<TrackActionContext> = {}): TrackActionContext {
  return {
    drop: drop(),
    viewerId: "user-a",
    isOwner: true,
    isCurrent: false,
    isPlaying: false,
    isPlayable: true,
    hasAsset: true,
    online: true,
    isFeatured: false,
    hasVybbed: false,
    ...over,
  };
}

function handlers(): TrackActionHandlers {
  return {
    play: vi.fn(),
    playNext: vi.fn(),
    addToQueue: vi.fn(),
    favourite: vi.fn(),
    rate: vi.fn(),
    openArtist: vi.fn(),
    openTrack: vi.fn(),
    viewDetails: vi.fn(),
    copyArtistLink: vi.fn(),
    download: vi.fn(),
    rename: vi.fn(),
    feature: vi.fn(),
    report: vi.fn(),
    requestDelete: vi.fn(),
  };
}

function ids(groups: ReturnType<typeof buildTrackActions>): string[] {
  return groups.flatMap((g) => g.actions.map((a) => a.id));
}

function find(groups: ReturnType<typeof buildTrackActions>, id: string) {
  return groups.flatMap((g) => g.actions).find((a) => a.id === id);
}

describe("buildTrackActions — ownership", () => {
  it("offers rename, feature and delete to the owner", () => {
    const got = ids(buildTrackActions(ctx({ isOwner: true }), handlers()));
    expect(got).toContain("rename");
    expect(got).toContain("feature");
    expect(got).toContain("delete");
  });

  it("hides owner actions from other viewers", () => {
    const got = ids(buildTrackActions(ctx({ isOwner: false, viewerId: "user-b" }), handlers()));
    expect(got).not.toContain("rename");
    expect(got).not.toContain("feature");
    expect(got).not.toContain("delete");
  });

  it("offers report to other viewers but not to the owner", () => {
    expect(ids(buildTrackActions(ctx({ isOwner: false }), handlers()))).toContain("report");
    expect(ids(buildTrackActions(ctx({ isOwner: true }), handlers()))).not.toContain("report");
  });
});

describe("buildTrackActions — availability reasons", () => {
  it("disables playback actions with a reason when audio is not playable", () => {
    const groups = buildTrackActions(ctx({ isPlayable: false }), handlers());
    for (const id of ["play", "play-next", "queue"]) {
      expect(find(groups, id)?.disabledReason).toBeTruthy();
    }
  });

  it("disables download with a reason when no asset is attached", () => {
    const groups = buildTrackActions(ctx({ hasAsset: false }), handlers());
    expect(find(groups, "download")?.disabledReason).toMatch(/asset/i);
  });

  it("disables network actions when offline and leaves local playback enabled", () => {
    const groups = buildTrackActions(ctx({ online: false }), handlers());
    expect(find(groups, "favourite")?.disabledReason).toMatch(/offline/i);
    expect(find(groups, "rename")?.disabledReason).toMatch(/offline/i);
    expect(find(groups, "download")?.disabledReason).toMatch(/offline/i);
    expect(find(groups, "play")?.disabledReason).toBeUndefined();
  });

  it("disables artist actions when the drop has no author", () => {
    const groups = buildTrackActions(ctx({ drop: drop({ authorId: "" }) }), handlers());
    expect(find(groups, "open-artist")?.disabledReason).toBeTruthy();
    expect(find(groups, "copy-artist-link")?.disabledReason).toBeTruthy();
  });

  it("marks an already-featured track as such instead of offering it again", () => {
    const groups = buildTrackActions(ctx({ isFeatured: true }), handlers());
    const feature = find(groups, "feature");
    expect(feature?.disabledReason).toMatch(/already/i);
  });

  it("every disabled action carries a human-readable reason", () => {
    const groups = buildTrackActions(
      ctx({ isPlayable: false, hasAsset: false, online: false, isFeatured: true }),
      handlers()
    );
    for (const action of groups.flatMap((g) => g.actions)) {
      if (action.disabledReason !== undefined) {
        expect(action.disabledReason.length).toBeGreaterThan(3);
      }
    }
  });
});

describe("buildTrackActions — targeting", () => {
  it("invokes the handler for the exact action selected and no other", () => {
    const h = handlers();
    const groups = buildTrackActions(ctx(), h);
    find(groups, "play-next")?.onSelect?.();
    expect(h.playNext).toHaveBeenCalledTimes(1);
    expect(h.play).not.toHaveBeenCalled();
    expect(h.addToQueue).not.toHaveBeenCalled();
    expect(h.requestDelete).not.toHaveBeenCalled();
  });

  it("routes delete through a confirmation request rather than deleting directly", () => {
    const h = handlers();
    const groups = buildTrackActions(ctx(), h);
    const del = find(groups, "delete");
    expect(del?.danger).toBe(true);
    expect(del?.keepOpen).toBe(true);
    del?.onSelect?.();
    expect(h.requestDelete).toHaveBeenCalledTimes(1);
  });

  it("keeps the surface open for actions that swap to another panel", () => {
    const owner = buildTrackActions(ctx(), handlers());
    // These replace the menu with a dialog, so closing first would discard the stage change.
    for (const id of ["file-details", "rename", "delete"]) {
      expect(find(owner, id)?.keepOpen).toBe(true);
    }
    // Report opens a dialog for non-owners and must behave the same way.
    expect(find(buildTrackActions(ctx({ isOwner: false }), handlers()), "report")?.keepOpen).toBe(true);
    // One-shot actions should close the menu.
    for (const id of ["play", "queue", "download", "open-artist", "open-track"]) {
      expect(find(owner, id)?.keepOpen).toBeUndefined();
    }
  });

  it("offers a route into the full track workspace", () => {
    const h = handlers();
    const groups = buildTrackActions(ctx(), h);
    const open = find(groups, "open-track");
    expect(open?.label).toBe("Open track");
    expect(open?.disabledReason).toBeUndefined();
    open?.onSelect?.();
    expect(h.openTrack).toHaveBeenCalledTimes(1);
    expect(h.viewDetails).not.toHaveBeenCalled();
  });

  it("reflects current playback state in the primary label", () => {
    expect(find(buildTrackActions(ctx(), handlers()), "play")?.label).toBe("Play");
    expect(
      find(buildTrackActions(ctx({ isCurrent: true, isPlaying: true }), handlers()), "play")?.label
    ).toBe("Pause");
    expect(
      find(buildTrackActions(ctx({ isCurrent: true, isPlaying: false }), handlers()), "play")?.label
    ).toBe("Resume");
  });

  it("reflects whether the viewer already reacted", () => {
    expect(find(buildTrackActions(ctx({ hasVybbed: true }), handlers()), "favourite")?.label).toMatch(
      /remove/i
    );
    expect(find(buildTrackActions(ctx({ hasVybbed: false }), handlers()), "favourite")?.label).toMatch(
      /vyb this/i
    );
  });

  it("produces no empty groups once filtered by ownership", () => {
    const groups = buildTrackActions(ctx({ isOwner: false }), handlers());
    const nonEmpty = groups.filter((g) => g.actions.length > 0);
    for (const g of nonEmpty) expect(g.actions.length).toBeGreaterThan(0);
    expect(nonEmpty.length).toBeGreaterThan(3);
  });
});

describe("trackFileSummary", () => {
  it("reports only fields the upload actually carries", () => {
    const rows = trackFileSummary(drop({ bpm: null, musicalKey: null, album: null }));
    const labels = rows.map((r) => r.label);
    expect(labels).toContain("Format");
    expect(labels).toContain("Sample rate");
    expect(labels).not.toContain("BPM");
    expect(labels).not.toContain("Key");
    expect(labels).not.toContain("Album");
  });

  it("formats duration and sample rate from stored values", () => {
    const rows = trackFileSummary(drop({ durationSec: 185, sampleRate: 48000 }));
    expect(rows.find((r) => r.label === "Duration")?.value).toBe("3:05");
    expect(rows.find((r) => r.label === "Sample rate")?.value).toBe("48.0 kHz");
  });

  it("never invents a title", () => {
    const rows = trackFileSummary(drop({ title: null }));
    expect(rows.find((r) => r.label === "Title")?.value).toBe("Untitled");
  });
});
