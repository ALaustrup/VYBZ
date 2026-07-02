// MYVYB XR — adaptive performance manager.
//
// Detects the headset class, applies the right foveation / framebuffer / pixel
// budget, requests the best supported refresh rate, and then *dynamically* trims
// the framebuffer scale if the frame budget slips — so Quest 2 holds 72 fps and
// Quest 3/Pro reach for 90/120 fps without ever stuttering. All degradation is
// graceful: a weaker device simply renders a touch softer, never janky.

import type * as THREE from "three";

export interface DeviceProfile {
  /** Human label for logging / HUD. */
  name: string;
  /** Target refresh rate we request from the session. */
  targetFps: number;
  /** Three.js foveation 0 (off) → 1 (max, cheapest periphery). */
  foveation: number;
  /** Baseline framebuffer scale (>1 supersamples on capable devices). */
  framebufferScale: number;
  /** Hard cap on device pixel ratio for the 2D/desktop preview. */
  maxPixelRatio: number;
  /** Suggested max number of live content panels for this device. */
  contentBudget: number;
  /** Whether the device supports color passthrough / mixed reality. */
  passthrough: boolean;
}

/** Best-effort headset classification from the UA string. */
export function detectXRDevice(): DeviceProfile {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isQuestPro = /Quest\s*Pro/i.test(ua);
  const isQuest3 = /Quest\s*3/i.test(ua);
  const isQuest2 = /Quest\s*2/i.test(ua);
  const isQuestFamily = /OculusBrowser|Quest/i.test(ua);
  const isPcvr = /SteamVR|OpenXR|Index|Vive|Windows Mixed Reality/i.test(ua);

  if (isQuestPro || isQuest3) {
    return {
      name: isQuestPro ? "Quest Pro" : "Quest 3",
      targetFps: 90,
      foveation: 0.55,
      framebufferScale: 1.15,
      maxPixelRatio: 2,
      contentBudget: 28,
      passthrough: true,
    };
  }
  if (isPcvr) {
    return {
      name: "PC VR",
      targetFps: 90,
      foveation: 0.35,
      framebufferScale: 1.2,
      maxPixelRatio: 2,
      contentBudget: 32,
      passthrough: false,
    };
  }
  if (isQuest2 || isQuestFamily) {
    return {
      name: isQuest2 ? "Quest 2" : "Quest",
      targetFps: 72,
      foveation: 1,
      framebufferScale: 0.9,
      maxPixelRatio: 2,
      contentBudget: 16,
      passthrough: false,
    };
  }
  return {
    name: "Generic XR",
    targetFps: 72,
    foveation: 0.5,
    framebufferScale: 1,
    maxPixelRatio: 2,
    contentBudget: 16,
    passthrough: false,
  };
}

export class XRPerfManager {
  readonly profile: DeviceProfile;
  private renderer: THREE.WebGLRenderer;
  private scale: number;
  private emaFrame = 1 / 72;
  private lastAdjust = 0;

  constructor(renderer: THREE.WebGLRenderer, profile = detectXRDevice()) {
    this.renderer = renderer;
    this.profile = profile;
    this.scale = profile.framebufferScale;
  }

  /** Apply the static budget (safe to call before a session exists). */
  applyBaseline(): void {
    try {
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, this.profile.maxPixelRatio)
      );
      this.renderer.xr.setFoveation?.(this.profile.foveation);
      this.renderer.xr.setFramebufferScaleFactor?.(this.scale);
    } catch {
      /* older three / no-xr: ignore */
    }
  }

  /** Request the target refresh rate once a session begins. */
  onSessionStart(session: XRSession): void {
    try {
      // Not in the lib.dom types yet on all TS versions.
      (session as unknown as { updateTargetFrameRate?: (fps: number) => void })
        .updateTargetFrameRate?.(this.profile.targetFps);
    } catch {
      /* unsupported — the runtime picks a sensible default */
    }
    this.applyBaseline();
  }

  /**
   * Per-frame watchdog. Smooths frame time and, at most every ~2s, nudges the
   * framebuffer scale down under sustained pressure (or back up when we have
   * headroom) between 0.7× and the device baseline.
   */
  update(dt: number, elapsed: number): void {
    if (!this.renderer.xr.isPresenting) return;
    if (dt > 0 && dt < 0.5) this.emaFrame = this.emaFrame * 0.9 + dt * 0.1;
    if (elapsed - this.lastAdjust < 2) return;

    const budget = 1 / this.profile.targetFps;
    let next = this.scale;
    if (this.emaFrame > budget * 1.25) next = Math.max(0.7, this.scale - 0.1);
    else if (this.emaFrame < budget * 0.85)
      next = Math.min(this.profile.framebufferScale, this.scale + 0.1);

    if (Math.abs(next - this.scale) > 0.001) {
      this.scale = next;
      try {
        this.renderer.xr.setFramebufferScaleFactor?.(this.scale);
      } catch {
        /* ignore */
      }
      this.lastAdjust = elapsed;
    }
  }
}
