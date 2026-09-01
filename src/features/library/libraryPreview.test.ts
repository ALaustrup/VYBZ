import { describe, expect, it } from "vitest";
import {
  cinemaChromeShouldHide,
  cinemaPlayRestartsFromStart,
  cinemaProgressFraction,
  cinemaProgressSeekFraction,
  cinemaProgressShouldShow,
  cinemaScrollStartsAudio,
  cinemaVideoShouldPreview,
  cinemaActiveTileIndex,
  cinemaArrowStartsAudio,
  cinemaKeyboardIsGalleryNav,
  cinemaKeyboardTargetIsControl,
  cinemaVisualSpaceIsTap,
  cinemaVisualClockIsLive,
  cinemaClockLabel,
} from "./libraryPreview";

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

  it("fills cinema progress from a known duration, not from a missing clock", () => {
    expect(cinemaProgressFraction({ currentTime: 3.5, duration: 7 })).toBe(0.5);
    expect(cinemaProgressFraction({ currentTime: 0, duration: 7 })).toBe(0);
    expect(cinemaProgressFraction({ currentTime: 7, duration: 7 })).toBe(1);
    expect(cinemaProgressFraction({ currentTime: 9, duration: 7 })).toBe(1);
    expect(cinemaProgressFraction({ currentTime: 3, duration: 0 })).toBe(0);
    expect(cinemaProgressFraction({ currentTime: Number.NaN, duration: 7 })).toBe(0);
  });

  it("seeks cinema progress from a tap on the bar", () => {
    expect(cinemaProgressSeekFraction({ clientX: 50, left: 0, width: 100 })).toBe(0.5);
    expect(cinemaProgressSeekFraction({ clientX: -10, left: 0, width: 100 })).toBe(0);
    expect(cinemaProgressSeekFraction({ clientX: 200, left: 0, width: 100 })).toBe(1);
    expect(cinemaProgressSeekFraction({ clientX: 50, left: 0, width: 0 })).toBe(0);
  });

  it("restarts an ended cinema work on tap, not a neighbor or a playing work", () => {
    expect(cinemaPlayRestartsFromStart({ isCurrent: true, playing: false, fraction: 1 })).toBe(true);
    expect(cinemaPlayRestartsFromStart({ isCurrent: true, playing: false, fraction: 0.5 })).toBe(false);
    expect(cinemaPlayRestartsFromStart({ isCurrent: true, playing: true, fraction: 1 })).toBe(false);
    expect(cinemaPlayRestartsFromStart({ isCurrent: false, playing: false, fraction: 1 })).toBe(false);
  });

  it("never starts AudioBus from an arrow", () => {
    expect(cinemaArrowStartsAudio()).toBe(false);
  });

  it("keeps cinema keys for the gallery, not for search, filters, or full-screen", () => {
    const base = {
      cinema: true,
      targetIsControl: false,
      visualOpen: false,
      filtersOpen: false,
    };
    expect(cinemaKeyboardIsGalleryNav(base)).toBe(true);
    expect(cinemaKeyboardIsGalleryNav({ ...base, cinema: false })).toBe(false);
    expect(cinemaKeyboardIsGalleryNav({ ...base, targetIsControl: true })).toBe(false);
    expect(cinemaKeyboardIsGalleryNav({ ...base, visualOpen: true })).toBe(false);
    expect(cinemaKeyboardIsGalleryNav({ ...base, filtersOpen: true })).toBe(false);
  });

  it("lets Space tap the full-screen visual, not when a control is held", () => {
    expect(cinemaVisualSpaceIsTap({ visualOpen: true, targetIsControl: false })).toBe(true);
    expect(cinemaVisualSpaceIsTap({ visualOpen: false, targetIsControl: false })).toBe(false);
    expect(cinemaVisualSpaceIsTap({ visualOpen: true, targetIsControl: true })).toBe(false);
  });

  it("fills the visual clock live, with 0:00 for a missing time", () => {
    expect(cinemaVisualClockIsLive()).toBe(true);
    expect(cinemaClockLabel(0)).toBe("0:00");
    expect(cinemaClockLabel(7)).toBe("0:07");
    expect(cinemaClockLabel(65)).toBe("1:05");
    expect(cinemaClockLabel(Number.NaN)).toBe("0:00");
  });

  it("treats fields and chrome as cinema key controls, not the gallery surface", () => {
    const field = document.createElement("input");
    const play = document.createElement("button");
    const surface = document.createElement("div");
    expect(cinemaKeyboardTargetIsControl(field)).toBe(true);
    expect(cinemaKeyboardTargetIsControl(play)).toBe(true);
    expect(cinemaKeyboardTargetIsControl(surface)).toBe(false);
    expect(cinemaKeyboardTargetIsControl(null)).toBe(false);
  });

  it("snaps cinema index from gallery scroll, not past the last work", () => {
    expect(cinemaActiveTileIndex({ scrollTop: 0, viewport: 500, count: 3 })).toBe(0);
    expect(cinemaActiveTileIndex({ scrollTop: 500, viewport: 500, count: 3 })).toBe(1);
    expect(cinemaActiveTileIndex({ scrollTop: 980, viewport: 500, count: 3 })).toBe(2);
    expect(cinemaActiveTileIndex({ scrollTop: 0, viewport: 0, count: 3 })).toBe(0);
    expect(cinemaActiveTileIndex({ scrollTop: 100, viewport: 500, count: 0 })).toBe(0);
  });
});
