import { describe, expect, it } from "vitest";
import { cinemaChromeShouldHide, cinemaProgressShouldShow, cinemaScrollStartsAudio, cinemaVideoShouldPreview } from "./libraryPreview";

describe("library cinema preview", () => {
  it("never starts AudioBus from scroll", () => {
    expect(cinemaScrollStartsAudio()).toBe(false);
  });

  it("recedes cinema overlay while watching or scrolling, not while filtering or reducing motion", () => {
    const base = {
      cinema: true,
      filtersOpen: false,
      reduceFx: false,
      hold: false,
      scrolled: false,
      playingSettled: false,
    };
    expect(cinemaChromeShouldHide(base)).toBe(false);
    expect(cinemaChromeShouldHide({ ...base, playingSettled: true })).toBe(true);
    expect(cinemaChromeShouldHide({ ...base, scrolled: true })).toBe(true);
    expect(cinemaChromeShouldHide({ ...base, playingSettled: true, filtersOpen: true })).toBe(false);
    expect(cinemaChromeShouldHide({ ...base, playingSettled: true, reduceFx: true })).toBe(false);
    expect(cinemaChromeShouldHide({ ...base, playingSettled: true, hold: true })).toBe(false);
    expect(cinemaChromeShouldHide({ ...base, playingSettled: true, cinema: false })).toBe(false);
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

  it("shows cinema progress on the current work, not on scroll neighbors", () => {
    expect(cinemaProgressShouldShow({ cinema: true, isCurrent: true })).toBe(true);
    expect(cinemaProgressShouldShow({ cinema: true, isCurrent: false })).toBe(false);
    expect(cinemaProgressShouldShow({ cinema: false, isCurrent: true })).toBe(false);
  });
});
