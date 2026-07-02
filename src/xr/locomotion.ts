// MYVYB XR — comfort locomotion.
//
// A player "rig" holds the camera + controllers so we can move/turn the user
// without touching the world. Provides:
//   • Arc teleport   — push the thumbstick forward to aim a parabolic beam at
//                      the floor, release to blink there.
//   • Snap turn      — flick the thumbstick left/right to rotate 30° in place
//                      (rotates about the head, not the origin — no drift).
//   • Comfort blink  — a head-locked vignette fades in during any move to kill
//                      vection (the #1 cause of VR nausea).
//
// All motion is discrete (teleport + snap) — the most comfort-safe scheme for a
// broad, first-time-friendly audience.

import * as THREE from "three";

const SNAP_ANGLE = Math.PI / 6; // 30°
const TELEPORT_SPEED = 7;
const GRAVITY = -9.8;
const MAX_RANGE = 13;
const ARC_POINTS = 32;

export interface LocomotionHandle {
  update: (dt: number, presenting: boolean) => void;
  dispose: () => void;
}

export function createLocomotion(opts: {
  scene: THREE.Scene;
  rig: THREE.Group;
  camera: THREE.Camera;
  controllers: THREE.Object3D[];
  getGamepad: (c: THREE.Object3D) => Gamepad | undefined;
  accent: string;
  floorY?: number;
}): LocomotionHandle {
  const { scene, rig, camera, controllers, getGamepad } = opts;
  const floorY = opts.floorY ?? 0;
  const accent = new THREE.Color(opts.accent);

  // Teleport aim beam (world-space).
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(ARC_POINTS * 3), 3)
  );
  const arc = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.85 })
  );
  arc.frustumCulled = false;
  arc.visible = false;
  scene.add(arc);

  // Landing reticle.
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.26, 32),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  // Head-locked comfort vignette (frames the periphery during motion).
  const vignette = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 2.4, 48),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  vignette.position.set(0, 0, -0.6);
  vignette.renderOrder = 999;
  camera.add(vignette);

  let vignetteTarget = 0;
  let aimingIndex = -1;
  const target = new THREE.Vector3();
  let hasTarget = false;
  const snapReady = [true, true];

  const v = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const head = new THREE.Vector3();

  function readStick(c: THREE.Object3D): { x: number; y: number } | null {
    const gp = getGamepad(c);
    if (!gp || !gp.axes || gp.axes.length === 0) return null;
    const a = gp.axes;
    const x = a.length >= 4 ? a[2] : a[0];
    const y = a.length >= 4 ? a[3] : a[1];
    return { x: x || 0, y: y || 0 };
  }

  /** Trace a parabola from a controller to the floor. Returns true on a hit. */
  function computeArc(c: THREE.Object3D): boolean {
    c.getWorldPosition(v);
    c.getWorldQuaternion(quat);
    fwd.set(0, 0, -1).applyQuaternion(quat).multiplyScalar(TELEPORT_SPEED);

    const pos = arcGeo.attributes.position as THREE.BufferAttribute;
    const startX = v.x;
    const startY = v.y;
    const startZ = v.z;
    let hit = false;
    let count = 0;
    for (let i = 0; i < ARC_POINTS; i++) {
      const t = i * 0.035;
      const px = startX + fwd.x * t;
      const py = startY + fwd.y * t + 0.5 * GRAVITY * t * t;
      const pz = startZ + fwd.z * t;
      pos.setXYZ(i, px, py, pz);
      count = i + 1;
      if (py <= floorY) {
        target.set(px, floorY + 0.02, pz);
        pos.setXYZ(i, px, floorY + 0.01, pz);
        hit = true;
        break;
      }
    }
    // Freeze remaining points at the last sample so the line looks clean.
    for (let i = count; i < ARC_POINTS; i++) {
      pos.setXYZ(i, pos.getX(count - 1), pos.getY(count - 1), pos.getZ(count - 1));
    }
    pos.needsUpdate = true;

    if (hit) {
      const dx = target.x - startX;
      const dz = target.z - startZ;
      if (Math.hypot(dx, dz) > MAX_RANGE) hit = false;
    }
    return hit;
  }

  /** Blink-teleport so the head ends up over the target (xz only). */
  function doTeleport(): void {
    camera.getWorldPosition(head);
    rig.position.x += target.x - head.x;
    rig.position.z += target.z - head.z;
    vignetteTarget = 0.9; // snaps to 0 over the next frames
  }

  /** Rotate the rig about the head so the user spins in place (no drift). */
  function snapTurn(sign: number): void {
    const angle = -sign * SNAP_ANGLE;
    camera.getWorldPosition(head);
    const dx = head.x - rig.position.x;
    const dz = head.z - rig.position.z;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    rig.position.x = head.x - rx;
    rig.position.z = head.z - rz;
    rig.rotation.y += angle;
    vignetteTarget = 0.55;
  }

  function update(dt: number, presenting: boolean): void {
    if (!presenting) {
      arc.visible = false;
      reticle.visible = false;
      (vignette.material as THREE.MeshBasicMaterial).opacity = 0;
      return;
    }

    let anyAiming = false;
    controllers.forEach((c, i) => {
      const stick = readStick(c);
      if (!stick) return;

      // Snap turn (debounced per controller).
      if (Math.abs(stick.x) > 0.7 && Math.abs(stick.x) > Math.abs(stick.y) && snapReady[i]) {
        snapTurn(Math.sign(stick.x));
        snapReady[i] = false;
      } else if (Math.abs(stick.x) < 0.3) {
        snapReady[i] = true;
      }

      // Teleport aim while pushed forward.
      if (stick.y < -0.6 && (aimingIndex === -1 || aimingIndex === i)) {
        aimingIndex = i;
        anyAiming = true;
        hasTarget = computeArc(c);
        arc.visible = true;
        reticle.visible = hasTarget;
        if (hasTarget) reticle.position.copy(target);
      }
    });

    // Release → commit the teleport.
    if (aimingIndex !== -1 && !anyAiming) {
      if (hasTarget) doTeleport();
      aimingIndex = -1;
      hasTarget = false;
      arc.visible = false;
      reticle.visible = false;
    }

    // Ease the comfort vignette toward its target, then relax it back to 0.
    const mat = vignette.material as THREE.MeshBasicMaterial;
    mat.opacity += (vignetteTarget - mat.opacity) * Math.min(1, dt * 14);
    vignetteTarget = Math.max(0, vignetteTarget - dt * 3);
  }

  function dispose(): void {
    scene.remove(arc);
    scene.remove(reticle);
    camera.remove(vignette);
    arc.geometry.dispose();
    (arc.material as THREE.Material).dispose();
    reticle.geometry.dispose();
    (reticle.material as THREE.Material).dispose();
    vignette.geometry.dispose();
    (vignette.material as THREE.Material).dispose();
  }

  return { update, dispose };
}
