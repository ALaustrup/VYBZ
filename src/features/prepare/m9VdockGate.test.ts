import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DRY_PLAYBACK_VERSION,
  ambientSignal,
  catalogSignal,
  resolveTrackSignal,
} from "@/lib/vdock/playbackSignal";
import { dryPlaybackCapabilities } from "@/platform/bridge/playbackCapabilities";
import { createMockBridge } from "@/platform/bridge/mock";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * M9 exit-gate starter — Masterplan §10 VDock Completion / Law 5.
 * Gate: VDock reliable across web, desktop and Android; correctly represents
 * active processing and simulation; never applies hidden processing; core
 * frozen behind stable interfaces.
 */
describe("M9 VDock gate", () => {
  it("cites the M9 gate and ships a versioned dry-playback contract", () => {
    const masterplan = readFileSync(path.join(ROOT, "VYBZ_MASTERPLAN.md"), "utf8");
    expect(masterplan).toMatch(/M9.*VDock|VDock Completion/s);
    expect(masterplan).toMatch(/Law 5|VDock never applies undisclosed processing/i);
    expect(DRY_PLAYBACK_VERSION).toMatch(/^m9\./);
  });

  it("freezes AudioBus as a dry HTMLAudioElement engine (no hidden DSP)", () => {
    const bus = readFileSync(path.join(ROOT, "src/lib/audioBus.ts"), "utf8");
    expect(bus).toContain("createMediaElementSource");
    expect(bus).toMatch(/do NOT call createMediaElementSource/i);
    expect(bus).not.toMatch(/audioEl\.playbackRate\s*=/);
    expect(bus).not.toMatch(/new\s+OfflineAudioContext\s*\(/);
    // Prohibit live DSP graph wiring on the play element (comments may name the APIs).
    expect(bus).not.toMatch(/\.createBiquadFilter\s*\(/);
    expect(bus).not.toMatch(/\.createDynamicsCompressor\s*\(/);
    expect(bus).not.toMatch(/\.createMediaElementSource\s*\(/);
    expect(bus).toContain("signal");
    expect(bus).toContain("resolveTrackSignal");
    expect(bus).not.toContain("navigator.mediaSession");
  });

  it("surfaces disclosure in the dock when signal.disclosure is set", () => {
    const player = readFileSync(path.join(ROOT, "src/components/GlobalPlayer.tsx"), "utf8");
    const vdock = readFileSync(path.join(ROOT, "src/components/vdock/VDock.tsx"), "utf8");
    expect(player).toContain("data-vdock-disclosure");
    expect(player).toContain("signal?.disclosure");
    expect(vdock).toContain("MusicDockPlayer");
  });

  it("tags ambient pad with a non-null disclosure", () => {
    const ambient = ambientSignal();
    expect(ambient.kind).toBe("ambient");
    expect(ambient.disclosure).toBeTruthy();
    expect(ambient.disclosure!.toLowerCase()).toContain("dry");
    expect(catalogSignal().disclosure).toBeNull();
    expect(
      resolveTrackSignal({ id: "vybz-ambient-pad", url: "blob:x" })?.kind
    ).toBe("ambient");
  });

  it("exposes playback capabilities on the Platform Bridge (no native DSP)", async () => {
    const caps = dryPlaybackCapabilities();
    expect(caps.dryHtmlAudio).toBe(true);
    expect(caps.nativeDsp).toBe(false);
    const bridge = createMockBridge();
    const live = await bridge.playback.getCapabilities();
    expect(live).toEqual(caps);
    const types = readFileSync(path.join(ROOT, "src/platform/bridge/types.ts"), "utf8");
    expect(types).toContain("playback:");
    expect(types).toContain("PlaybackCapabilities");
    expect(types).toContain("bindMediaSession");
    const mediaSession = readFileSync(
      path.join(ROOT, "src/platform/bridge/mediaSession.ts"),
      "utf8",
    );
    expect(mediaSession).toContain("bindBrowserMediaSession");
    expect(mediaSession).toContain("setActionHandler");
  });
});
