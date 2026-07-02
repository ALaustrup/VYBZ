// MYVYB XR — spatial audio.
//
// A calm ambient drone that lives around you, plus HRTF-spatialized Vyb/Fail
// blips that ring out from the exact 3D position of the card you reacted to.
// Built on THREE.AudioListener (which keeps the WebAudio listener locked to the
// headset pose) + raw WebAudio nodes for zero asset weight. Everything is
// wrapped so a missing/blocked AudioContext can never break the scene.

import * as THREE from "three";

export interface XRAudioHandle {
  /** Resume the context (must be called from a user gesture, e.g. Enter VR). */
  resume: () => void;
  /** Play a spatial reaction blip at a world position. */
  blip: (worldPos: THREE.Vector3, kind: "feel" | "wild") => void;
  setEnabled: (on: boolean) => void;
  dispose: () => void;
}

export function createXRAudio(camera: THREE.Camera): XRAudioHandle {
  let listener: THREE.AudioListener | null = null;
  let ctx: AudioContext | null = null;
  let master: AudioNode | null = null;
  let droneNodes: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  let enabled = true;
  let started = false;

  try {
    listener = new THREE.AudioListener();
    camera.add(listener);
    ctx = listener.context;
    master = listener.getInput();
  } catch {
    listener = null;
  }

  function startDrone(): void {
    if (!ctx || !master || droneNodes) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 320;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 82.5; // a fifth up, gentle beating
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      osc2.start();
      gain.gain.linearRampToValueAtTime(enabled ? 0.05 : 0, ctx.currentTime + 4);
      // Keep a handle to the primary osc for teardown (osc2 stops with context).
      droneNodes = { osc, gain, filter };
      // Stash osc2 so dispose can stop it too.
      (droneNodes as unknown as { osc2?: OscillatorNode }).osc2 = osc2;
    } catch {
      /* ignore */
    }
  }

  function resume(): void {
    if (!ctx) return;
    try {
      void ctx.resume();
    } catch {
      /* ignore */
    }
    if (!started) {
      started = true;
      startDrone();
    }
  }

  function blip(worldPos: THREE.Vector3, kind: "feel" | "wild"): void {
    if (!ctx || !master || !enabled) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1;
      panner.maxDistance = 30;
      panner.rolloffFactor = 1;
      if (typeof panner.positionX !== "undefined") {
        panner.positionX.value = worldPos.x;
        panner.positionY.value = worldPos.y;
        panner.positionZ.value = worldPos.z;
      } else {
        // Deprecated fallback for older engines.
        (panner as unknown as { setPosition: (x: number, y: number, z: number) => void })
          .setPosition(worldPos.x, worldPos.y, worldPos.z);
      }

      osc.type = kind === "feel" ? "sine" : "triangle";
      const f0 = kind === "feel" ? 660 : 340;
      const f1 = kind === "feel" ? 990 : 220;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f1, now + 0.18);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(master);
      osc.start(now);
      osc.stop(now + 0.4);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
          panner.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }
  }

  function setEnabled(on: boolean): void {
    enabled = on;
    if (droneNodes && ctx) {
      try {
        droneNodes.gain.gain.linearRampToValueAtTime(on ? 0.05 : 0, ctx.currentTime + 0.4);
      } catch {
        /* ignore */
      }
    }
  }

  function dispose(): void {
    try {
      if (droneNodes) {
        droneNodes.osc.stop();
        (droneNodes as unknown as { osc2?: OscillatorNode }).osc2?.stop();
      }
    } catch {
      /* ignore */
    }
    try {
      if (listener) camera.remove(listener);
    } catch {
      /* ignore */
    }
    droneNodes = null;
  }

  return { resume, blip, setEnabled, dispose };
}
