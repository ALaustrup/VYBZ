import { describe, expect, it } from "vitest";
import { cinemaScrollStartsAudio, cinemaVideoShouldPreview } from "./libraryPreview";

describe("library cinema preview", () => {
  it("never starts AudioBus from scroll", () => {
    expect(cinemaScrollStartsAudio()).toBe(false);
  });

  it("muted-previews video only while in view, motion allowed, and nothing else is playing", () => {
    const base = {
      kind: "video" as const,
      inView: true,
      reduceFx: false,
      audioPlaying: false,
      visualOpen: false,
    };
    expect(cinemaVideoShouldPreview(base)).toBe(true);
    expect(cinemaVideoShouldPreview({ ...base, inView: false })).toBe(false);
    expect(cinemaVideoShouldPreview({ ...base, reduceFx: true })).toBe(false);
    expect(cinemaVideoShouldPreview({ ...base, audioPlaying: true })).toBe(false);
    expect(cinemaVideoShouldPreview({ ...base, visualOpen: true })).toBe(false);
    expect(cinemaVideoShouldPreview({ ...base, kind: "audio" })).toBe(false);
    expect(cinemaVideoShouldPreview({ ...base, kind: "image" })).toBe(false);
  });
});
