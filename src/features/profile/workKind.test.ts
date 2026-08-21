import { describe, expect, it } from "vitest";
import { classifyUrl, collectStageWorks, WORK_KINDS } from "./workKind";
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
  it("names the six living-portfolio kinds", () => {
    expect([...WORK_KINDS]).toEqual(["audio", "image", "video", "file", "project", "link"]);
  });

  it("classifies urls without inventing a kind", () => {
    expect(classifyUrl("https://cdn.example/still.png")).toBe("image");
    expect(classifyUrl("https://cdn.example/clip.mp4")).toBe("video");
    expect(classifyUrl("https://cdn.example/mix.flac")).toBe("audio");
    expect(classifyUrl("https://example.com/demo")).toBe("link");
    expect(classifyUrl("notes.zip")).toBe("file");
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
    ];
    const works = collectStageWorks({
      drops: [drop(), drop({ id: "d2", audioUrl: undefined, title: "Notes", body: "text" })],
      projects: [project],
      posts,
      demoUrl: "https://example.com/press",
    });
    const kinds = [...new Set(works.map((w) => w.kind))].sort();
    expect(kinds).toEqual(["audio", "file", "image", "link", "project", "video"]);
    expect(works.find((w) => w.kind === "project")?.href).toBe("/p/p1");
  });
});
