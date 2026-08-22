import { describe, expect, it } from "vitest";
import { classifyUrl, collectStageWorks, isWorkKind, WORK_KINDS } from "./workKind";
import { MODULE_RENDERERS, rendererFor, UnknownWork, WORK_RENDERERS } from "./WorkCard";
import type { Drop, ProfileProject, ProjectPost } from "@/types";

const drop = (over: Partial<Drop> = {}): Drop => ({
  id: "d1",
  authorId: "u1",
  authorUsername: "a",
  title: "Song",
  body: null,
  seed: 1,
  feels: 0,
  wilds: 0,
  createdAt: 1,
  audioUrl: "https://cdn.example/a.wav",
  ...over,
});

describe("work kinds", () => {
  it("names the first-release living-portfolio kinds", () => {
    expect([...WORK_KINDS]).toEqual([
      "audio",
      "image",
      "video",
      "file",
      "project",
      "link",
      "text",
      "collection",
    ]);
  });

  it("registers a renderer for every work kind", () => {
    expect(Object.keys(MODULE_RENDERERS).sort()).toEqual([...WORK_KINDS].sort());
    expect(Object.keys(WORK_RENDERERS).sort()).toEqual([...WORK_KINDS].sort());
  });

  it("falls back for unknown kinds instead of crashing", () => {
    expect(isWorkKind("voxel")).toBe(false);
    expect(rendererFor("voxel")).toBe(UnknownWork);
    expect(rendererFor("audio")).toBe(MODULE_RENDERERS.audio);
  });

  it("classifies urls without inventing a kind", () => {
    expect(classifyUrl("https://cdn.example/still.png")).toBe("image");
    expect(classifyUrl("https://cdn.example/clip.mp4")).toBe("video");
    expect(classifyUrl("https://cdn.example/mix.flac")).toBe("audio");
    expect(classifyUrl("https://example.com/demo")).toBe("link");
    expect(classifyUrl("notes.zip")).toBe("file");
    expect(classifyUrl("https://cdn.example/press.pdf")).toBe("file");
    expect(classifyUrl("https://x.com/a", "image")).toBe("image");
  });

  it("collects more than audio onto the Stage File", () => {
    const project: ProfileProject = {
      id: "p1",
      userId: "u1",
      name: "Shorts",
      kind: "video",
      tagline: "Cuts",
      accent: null,
      coverUrl: null,
      sort: 0,
      posts: 1,
      links: 0,
      followers: 0,
      following: false,
    };
    const posts: ProjectPost[] = [
      { id: "i1", kind: "image", title: "Still", body: null, mediaUrl: "https://cdn.example/s.jpg", linkUrl: null, createdAt: 1, likes: 0, liked: false },
      { id: "v1", kind: "video", title: "Cut", body: null, mediaUrl: "https://cdn.example/c.mp4", linkUrl: null, createdAt: 1, likes: 0, liked: false },
      { id: "l1", kind: "link", title: "Demo", body: null, mediaUrl: null, linkUrl: "https://example.com/demo", createdAt: 1, likes: 0, liked: false },
      { id: "t1", kind: "text", title: "Liner", body: "Written note", mediaUrl: null, linkUrl: null, createdAt: 1, likes: 0, liked: false },
    ];
    const works = collectStageWorks({
      drops: [drop(), drop({ id: "d2", audioUrl: undefined, title: "Notes", body: "text" })],
      projects: [project],
      posts,
      demoUrl: "https://example.com/press",
    });
    const kinds = [...new Set(works.map((w) => w.kind))].sort();
    expect(kinds).toEqual(["audio", "image", "link", "project", "text", "video"]);
    expect(works.find((w) => w.kind === "project")?.href).toBe("/p/p1");
    expect(works.find((w) => w.id === "drop:d2")?.kind).toBe("text");
    expect(works.find((w) => w.id === "post:t1")?.body).toBe("Written note");
  });

  it("folds two album tracks into one collection and leaves singles as audio", () => {
    const works = collectStageWorks({
      drops: [
        drop({ id: "a1", title: "One", album: "Night Shift" }),
        drop({ id: "a2", title: "Two", album: "Night Shift" }),
        drop({ id: "s1", title: "Single", album: null }),
      ],
    });
    const collections = works.filter((w) => w.kind === "collection");
    expect(collections).toHaveLength(1);
    expect(collections[0].title).toBe("Night Shift");
    expect(collections[0].itemCount).toBe(2);
    expect(collections[0].items?.map((i) => i.title)).toEqual(["One", "Two"]);
    expect(works.some((w) => w.id === "drop:a1")).toBe(false);
    expect(works.find((w) => w.id === "drop:s1")?.kind).toBe("audio");
  });

  it("renders a connected playlist as a collection from stored data", () => {
    const works = collectStageWorks({
      playlists: [
        {
          id: "pl1",
          provider: "spotify",
          externalUrl: "https://open.spotify.com/playlist/1",
          title: "Late",
          trackCount: 12,
        },
      ],
    });
    expect(works).toHaveLength(1);
    expect(works[0].kind).toBe("collection");
    expect(works[0].itemCount).toBe(12);
    expect(works[0].href).toContain("spotify");
  });
});
