/**
 * The queue's pure half. Everything here is a value-in, value-out function so
 * the ordering and precedence rules can be pinned without a network or a DOM.
 */
import { describe, expect, it } from "vitest";
import {
  applyAnalysis,
  applyTags,
  buildDropInput,
  canReleaseItem,
  collectUploadFiles,
  createUploadItem,
  editMeta,
  itemStatusLabel,
  MAX_CONCURRENT_UPLOADS,
  MAX_UPLOAD_BYTES,
  nextUploadIds,
  patchItems,
  summarizeQueue,
  type UploadItem,
} from "@/features/upload/uploadQueue";
import type { Id3Tags } from "@/lib/id3Tags";

function audioFile(name = "take-one.wav", size = 1024): File {
  const f = new File([new Uint8Array(1)], name, { type: "audio/wav" });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

function item(overrides: Partial<UploadItem> = {}): UploadItem {
  return { ...createUploadItem(audioFile(), "id-1", 7), ...overrides };
}

function tags(partial: Partial<Id3Tags>): Id3Tags {
  return {
    title: null, artist: null, album: null, genre: null,
    genreMatched: null, bpm: null, year: null, artworkUrl: null,
    ...partial,
  } as Id3Tags;
}

describe("collectUploadFiles", () => {
  it("keeps audio and counts what it turned away, by reason", () => {
    const big = audioFile("huge.wav", MAX_UPLOAD_BYTES + 1);
    const empty = audioFile("empty.wav", 0);
    const exe = new File([new Uint8Array(1)], "notes.exe", { type: "application/x-msdownload" });
    const out = collectUploadFiles([audioFile(), big, empty, exe]);
    expect(out.files).toHaveLength(1);
    expect(out.skippedOversize).toBe(1);
    expect(out.skippedEmpty).toBe(1);
    expect(out.skippedNonAudio).toBe(1);
  });

  it("keeps image, video, and documents as Creative Work", () => {
    const png = new File([new Uint8Array(1)], "still.png", { type: "image/png" });
    const mp4 = new File([new Uint8Array(1)], "cut.mp4", { type: "video/mp4" });
    const pdf = new File([new Uint8Array(1)], "notes.pdf", { type: "application/pdf" });
    const out = collectUploadFiles([png, mp4, pdf]);
    expect(out.files).toHaveLength(3);
    expect(out.skippedNonAudio).toBe(0);
  });

  it("treats no selection as an empty batch rather than throwing", () => {
    expect(collectUploadFiles(null).files).toEqual([]);
  });
});

describe("metadata precedence", () => {
  it("fills empty fields from container tags", () => {
    const next = applyTags(item(), tags({ title: "Nightdrive", artist: "Vela", album: "Interior" }));
    expect(next.meta.title).toBe("Nightdrive");
    expect(next.meta.creditedArtist).toBe("Vela");
    expect(next.autoFilled).toContain("title");
  });

  it("never overwrites something the artist typed", () => {
    const typed = editMeta(item(), "title", "My Own Title");
    const next = applyTags(typed, tags({ title: "Tag Title" }));
    expect(next.meta.title).toBe("My Own Title");
    expect(next.autoFilled).not.toContain("title");
  });

  it("lets an edit take a field back from auto-fill", () => {
    const auto = applyTags(item(), tags({ title: "Tag Title" }));
    expect(auto.autoFilled).toContain("title");
    const edited = editMeta(auto, "title", "Mine");
    expect(edited.autoFilled).not.toContain("title");
    expect(edited.touched).toContain("title");
  });

  it("lands measured values but still respects edits on editable ones", () => {
    const typed = editMeta(item(), "bpm", "120");
    const next = applyAnalysis(typed, {
      peaks: [0.1, 0.9],
      duration: 214,
      sampleRate: 48000,
      bpm: 174,
      key: null,
    } as never);
    expect(next.meta.durationSec).toBe(214);
    expect(next.meta.sampleRate).toBe(48000);
    expect(next.meta.bpm).toBe("120");
  });

  it("leaves the item alone when analysis produced nothing", () => {
    const before = item();
    expect(applyAnalysis(before, null)).toBe(before);
  });
});

describe("concurrency", () => {
  it("starts no more than the cap allows", () => {
    const queued = Array.from({ length: 5 }, (_, i) => item({ id: `i${i}`, status: "reading" }));
    expect(nextUploadIds(queued, [])).toHaveLength(MAX_CONCURRENT_UPLOADS);
    expect(nextUploadIds(queued, ["i0"])).toHaveLength(MAX_CONCURRENT_UPLOADS - 1);
    expect(nextUploadIds(queued, ["i0", "i1"])).toEqual([]);
  });

  it("only starts items that have not been sent yet", () => {
    const mixed = [
      item({ id: "a", status: "uploading" }),
      item({ id: "b", status: "ready" }),
      item({ id: "c", status: "reading" }),
    ];
    expect(nextUploadIds(mixed, [])).toEqual(["c"]);
  });
});

describe("release readiness", () => {
  it("needs bytes on the server, not a finished decode", () => {
    expect(canReleaseItem(item({ status: "analyzing", path: "u/drops/a.wav" }))).toBe(true);
    expect(canReleaseItem(item({ status: "ready", path: "u/drops/a.wav" }))).toBe(true);
  });

  it("refuses when the bytes are not up", () => {
    expect(canReleaseItem(item({ status: "uploading", percent: 100, path: null }))).toBe(false);
    expect(canReleaseItem(item({ status: "failed", path: null }))).toBe(false);
  });
});

describe("itemStatusLabel", () => {
  it("never leaves a phase unlabelled", () => {
    const statuses = ["reading", "uploading", "analyzing", "ready", "failed", "released"] as const;
    for (const status of statuses) {
      expect(itemStatusLabel(item({ status })).trim()).not.toBe("");
    }
  });

  it("distinguishes bytes-sent from accepted, which is the whole bug", () => {
    const label = itemStatusLabel(item({ status: "uploading", percent: 100 }));
    expect(label).toMatch(/finalizing/i);
    expect(itemStatusLabel(item({ status: "uploading", percent: 40 }))).toMatch(/40/);
  });

  it("shows the row's own error when it failed", () => {
    expect(itemStatusLabel(item({ status: "failed", error: "Storage rejected the file." }))).toBe(
      "Storage rejected the file.",
    );
  });
});

describe("summarizeQueue", () => {
  it("counts an empty queue without dividing by zero", () => {
    expect(summarizeQueue([])).toMatchObject({ total: 0, percent: 0 });
  });

  it("separates in-flight, releasable, released and failed", () => {
    const summary = summarizeQueue([
      item({ id: "a", status: "uploading", percent: 50 }),
      item({ id: "b", status: "ready", path: "p", percent: 100 }),
      item({ id: "c", status: "released", path: "p" }),
      item({ id: "d", status: "failed", error: "no" }),
    ]);
    expect(summary).toMatchObject({ total: 4, inFlight: 1, releasable: 1, released: 1, failed: 1 });
  });
});

describe("patchItems", () => {
  it("returns the same array when nothing matched, so React can skip the render", () => {
    const list = [item({ id: "a" })];
    expect(patchItems(list, "missing", { percent: 10 })).toBe(list);
  });
});

describe("buildDropInput", () => {
  it("only ever makes tracks — intake asks no kind question", () => {
    const input = buildDropInput(item({ path: "u/drops/a.wav" }), {
      audience: "public",
      releaseType: "original",
    });
    expect(input.assetKind).toBe("track");
    expect(input.audioUrl).toBe("u/drops/a.wav");
  });

  it("omits a bpm that was never measured rather than sending zero", () => {
    const input = buildDropInput(item({ path: "p" }), { audience: "public", releaseType: "original" });
    expect(input.bpm).toBeUndefined();
  });

  it("carries a typed bpm through", () => {
    const typed = editMeta(item({ path: "p" }), "bpm", "128");
    const input = buildDropInput(typed, { audience: "public", releaseType: "original" });
    expect(input.bpm).toBe(128);
  });

  it("carries a declared body through for generated-work disclosure", () => {
    const input = buildDropInput(item({ path: "p", body: "Generated with Stable Audio 3 (small-music)." }), {
      audience: "public",
      releaseType: "original",
    });
    expect(input.body).toContain("Generated with Stable Audio 3");
  });
});
