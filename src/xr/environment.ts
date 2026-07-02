// MYVYB XR — cinematic environment.
//
// A cheap-but-gorgeous immersive backdrop tuned for standalone headsets: a
// gradient sky dome, a fog-fading depth grid (crucial for VR scale/comfort),
// slow-drifting additive aurora ribbons, and a layered nebula. Everything is
// unlit + additive + depthWrite-off so the draw-call and fill cost stay tiny.

import * as THREE from "three";

export interface EnvHandle {
  group: THREE.Group;
  update: (dt: number, t: number) => void;
  dispose: () => void;
}

function rgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Vertical gradient sky: deep void at the zenith, an accent horizon glow. */
function makeSkyTexture(base: string, accent: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, base);
  g.addColorStop(0.55, base);
  g.addColorStop(0.82, rgba(accent, 0.22));
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft elongated glow strip used for aurora ribbons. */
function makeRibbonTexture(accent: string, accent2: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.4, rgba(accent, 0.55));
  g.addColorStop(0.6, rgba(accent2, 0.55));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  const vg = ctx.createLinearGradient(0, 0, 0, 64);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.5, "rgba(255,255,255,1)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillRect(0, 0, 256, 64);
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createEnvironment(
  base: string,
  accent: string,
  accent2: string
): EnvHandle {
  const group = new THREE.Group();

  // Sky dome — large inverted sphere; unlit, no depth write.
  const skyTex = makeSkyTexture(base, accent);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(45, 24, 16),
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  group.add(sky);

  // Depth grid floor — fades into the fog, giving strong scale/comfort cues.
  const grid = new THREE.GridHelper(40, 40, accent, accent);
  const gridMat = grid.material as THREE.LineBasicMaterial | THREE.LineBasicMaterial[];
  (Array.isArray(gridMat) ? gridMat : [gridMat]).forEach((m) => {
    m.transparent = true;
    m.opacity = 0.14;
    m.depthWrite = false;
  });
  grid.position.y = 0.02;
  group.add(grid);

  // Aurora ribbons — a few big additive curved strips drifting overhead.
  const ribbonTex = makeRibbonTexture(accent, accent2);
  const ribbons: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(22, 3.4, 20, 1);
    // Gently arc the strip so it wraps around the viewer.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      pos.setZ(v, -Math.cos((x / 22) * Math.PI) * 3.5);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const ribbon = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        map: ribbonTex,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    ribbon.position.set(0, 6.5 + i * 1.6, -2);
    ribbon.rotation.z = (i - 1) * 0.18;
    ribbon.userData.phase = i * 2.1;
    ribbons.push(ribbon);
    group.add(ribbon);
  }

  // Layered nebula — a large, slow, low-opacity accent point cloud for depth.
  const N = 900;
  const nebPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 12 + Math.random() * 26;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    nebPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    nebPos[i * 3 + 1] = r * Math.cos(ph) * 0.5 + 3;
    nebPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute("position", new THREE.BufferAttribute(nebPos, 3));
  const nebula = new THREE.Points(
    nebGeo,
    new THREE.PointsMaterial({
      color: new THREE.Color(accent2),
      size: 0.16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(nebula);

  function update(dt: number, t: number): void {
    nebula.rotation.y += dt * 0.006;
    ribbons.forEach((r, i) => {
      const mat = r.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.32 + Math.sin(t * 0.35 + r.userData.phase) * 0.18;
      r.position.x = Math.sin(t * 0.08 + i) * 1.2;
    });
  }

  function dispose(): void {
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    skyTex.dispose();
    ribbonTex.dispose();
  }

  return { group, update, dispose };
}
