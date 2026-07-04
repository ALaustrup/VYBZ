// MYVYB XR — spatial layout solver.
//
// Computes a target position + orientation for each card in one of four "rooms".
// Cards smoothly morph between layouts (the caller slerps toward these targets),
// so switching feels like the whole gallery reflows around you. Orientation is
// derived the same proven way as the original ring (a temp object looking at the
// vertical axis) so every card faces you regardless of mode.

import * as THREE from "three";

export type LayoutMode = "ring" | "wall" | "sphere" | "helix";

export const LAYOUT_MODES: LayoutMode[] = ["ring", "wall", "sphere", "helix"];

export const LAYOUT_LABEL: Record<LayoutMode, string> = {
  ring: "Ring",
  wall: "Wall",
  sphere: "Sphere",
  helix: "Helix",
};

export interface LayoutTarget {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

const _facer = new THREE.Object3D();
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Orient a card at `pos` to face the vertical axis at height `lookY`. */
function face(pos: THREE.Vector3, lookY: number): THREE.Quaternion {
  _facer.position.copy(pos);
  _facer.lookAt(0, lookY, 0);
  return _facer.quaternion.clone();
}

export function computeLayout(
  mode: LayoutMode,
  i: number,
  n: number,
  eye: number
): LayoutTarget {
  const count = Math.max(1, n);
  switch (mode) {
    // Cinema arc — a curved video-wall in front of you, stacked in rows.
    case "wall": {
      const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.6)));
      const rows = Math.ceil(count / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const radius = 3.6;
      const perCol = Math.min(0.34, 2.0 / cols); // radians between columns
      const angle = (col - (cols - 1) / 2) * perCol;
      const vgap = 1.05;
      const y = eye + ((rows - 1) / 2 - row) * vgap;
      const pos = new THREE.Vector3(
        Math.sin(angle) * radius,
        y,
        -Math.cos(angle) * radius
      );
      return { pos, quat: face(pos, eye) };
    }

    // Dome — a Fibonacci sphere wrapping all around you.
    case "sphere": {
      const radius = 3.5;
      const y = 1 - (i / count) * 2 + 1 / count; // (-1, 1)
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * GOLDEN;
      const pos = new THREE.Vector3(
        Math.cos(phi) * rr * radius,
        eye + y * (radius * 0.72),
        Math.sin(phi) * rr * radius
      );
      return { pos, quat: face(pos, pos.y) };
    }

    // Helix — a rising spiral corridor you can walk/teleport up.
    case "helix": {
      const turns = 2.2;
      const radius = 2.9;
      const a = (i / count) * Math.PI * 2 * turns;
      const y = eye - 1.25 + (i / count) * 2.7;
      const pos = new THREE.Vector3(
        Math.sin(a) * radius,
        y,
        -Math.cos(a) * radius
      );
      return { pos, quat: face(pos, y) };
    }

    // Ring — the classic slow carousel (default).
    case "ring":
    default: {
      const radius = 3.1;
      const a = (i / count) * Math.PI * 2;
      const pos = new THREE.Vector3(
        Math.sin(a) * radius,
        eye,
        -Math.cos(a) * radius
      );
      return { pos, quat: face(pos, eye) };
    }
  }
}
