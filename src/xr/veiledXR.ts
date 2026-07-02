// MYVYB XR — an immersive WebXR "veil gallery" built on vanilla Three.js so it
// stays decoupled from React's render loop and is fully tunable for Quest 2/3.
//
// You stand inside a dark, fog-wrapped void; recent confessions float as luminous
// panels on a slow-drifting ring. Point a controller to highlight one, pull the
// trigger to Feel it (green) or squeeze to Veil it (indigo). Renders a desktop
// orbit preview when not in a headset.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { XRPerfManager } from "./perf";
import { createEnvironment } from "./environment";
import { createLocomotion } from "./locomotion";
import { createXRAudio } from "./audio";

export interface XRConfession {
  id: string;
  text: string;
  alias: string;
  feels: number;
  wilds: number;
}

export interface VeiledXRHandle {
  enterVR: () => Promise<void>;
  isSupported: () => Promise<boolean>;
  dispose: () => void;
}

interface Options {
  confessions: XRConfession[];
  onReact?: (id: string, reaction: "feel" | "wild") => void;
  onSessionChange?: (active: boolean) => void;
  /** Primary ambiance accent (from the user's living-background variant). */
  accent?: string;
  /** Secondary iridescent accent. */
  accent2?: string;
}

const RING_RADIUS = 3.1;
const EYE = 1.55;
const FEEL = "#34f5a0";
const VEIL = "#7c8cff";
// "Smoked Glass" void base, matching the 2D app.
const BASE_HEX = 0x0a0b0f;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 7);
}

/** Draw a confession panel onto a canvas (re-used as a texture). */
function paintCard(canvas: HTMLCanvasElement, c: XRConfession) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Panel.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(20,12,32,0.96)");
  grad.addColorStop(1, "rgba(10,7,16,0.96)");
  ctx.fillStyle = grad;
  roundRect(ctx, 14, 14, W - 28, H - 28, 28);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(168,124,248,0.55)";
  ctx.shadowColor = "rgba(124,58,237,0.8)";
  ctx.shadowBlur = 26;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Body text.
  ctx.fillStyle = "#f3eefe";
  ctx.font = "600 30px 'Space Grotesk', system-ui, sans-serif";
  ctx.textBaseline = "top";
  const lines = wrap(ctx, c.text, W - 90);
  lines.forEach((ln, i) => ctx.fillText(ln, 46, 54 + i * 40));

  // Footer: alias + counts.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  ctx.fillText(c.alias, 46, H - 70);

  ctx.textAlign = "right";
  ctx.fillStyle = FEEL;
  ctx.fillText(`♥ ${c.feels}`, W - 150, H - 70);
  ctx.fillStyle = VEIL;
  ctx.fillText(`◐ ${c.wilds}`, W - 46, H - 70);
  ctx.textAlign = "left";
}

function makeTitleTexture(accent: string, accent2: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
  g.addColorStop(0, "#f4effe");
  g.addColorStop(0.5, accent);
  g.addColorStop(1, accent2);
  ctx.fillStyle = g;
  ctx.font = "700 150px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 40;
  ctx.fillText("M Y V Y B", canvas.width / 2, canvas.height / 2 + 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function rgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function makeHelpTexture(accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 24);
  ctx.fillStyle = "rgba(15,17,23,0.85)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(accent, 0.5);
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f3eefe";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Point at a confession", canvas.width / 2, 56);
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Grip = Fail  ·  Trigger = Vyb", canvas.width / 2, 104);
  ctx.fillText("Stick: push = teleport · flick = turn", canvas.width / 2, 144);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function makeFloorTexture(accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, rgba(accent, 0.5));
  g.addColorStop(0.5, rgba(accent, 0.12));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

export function mountVeiledXR(
  container: HTMLElement,
  opts: Options
): VeiledXRHandle {
  // Ambiance accents — default to the brand violet/teal, or the user's chosen
  // living-background variant when provided, so VR matches the 2D app.
  const accent = opts.accent ?? "#8b4ff2";
  const accent2 = opts.accent2 ?? "#2dd4bf";
  const accentColor = new THREE.Color(accent);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.xr.enabled = true;
  renderer.setClearColor(BASE_HEX, 1);
  container.appendChild(renderer.domElement);

  // Per-device budget: foveation, framebuffer scale, pixel ratio + refresh rate,
  // with a runtime watchdog that trims resolution before frames ever drop.
  const perf = new XRPerfManager(renderer);
  perf.applyBaseline();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BASE_HEX);
  scene.fog = new THREE.FogExp2(BASE_HEX, 0.07);

  const camera = new THREE.PerspectiveCamera(
    70,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, EYE, 6.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, EYE, 0);
  controls.enablePan = false;
  controls.minDistance = 0.2;
  controls.maxDistance = 9;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.update();

  // Player rig — holds the camera (and controllers) so comfort locomotion can
  // move/turn the user without ever moving the world around them.
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // Spatial audio: ambient drone + HRTF-positioned reaction blips.
  const audio = createXRAudio(camera);

  // Soft ambient light (cards are unlit, but the floor/title catch a little).
  scene.add(new THREE.AmbientLight(accentColor, 0.6));

  // Gallery group (slowly rotates so cards drift past you).
  const gallery = new THREE.Group();
  scene.add(gallery);

  // Starfield.
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 8 + Math.random() * 22;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph) * 0.6 + 2;
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: accentColor,
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  );
  scene.add(stars);

  // Cinematic environment — sky dome, depth grid, aurora ribbons, nebula.
  const env = createEnvironment(
    `#${BASE_HEX.toString(16).padStart(6, "0")}`,
    accent,
    accent2
  );
  scene.add(env.group);

  // Floor glow.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshBasicMaterial({
      map: makeFloorTexture(accent),
      transparent: true,
      depthWrite: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  scene.add(floor);

  // Title.
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({
      map: makeTitleTexture(accent, accent2),
      transparent: true,
      depthWrite: false,
    })
  );
  title.position.set(0, 2.7, 0);
  gallery.add(title);

  // Floating help panel — in-scene controls guidance (faces the user, stays put).
  const help = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.5),
    new THREE.MeshBasicMaterial({
      map: makeHelpTexture(accent),
      transparent: true,
      depthWrite: false,
    })
  );
  help.position.set(0, 0.9, -2.2);
  scene.add(help);

  // Hover highlight ring that sits behind the focused card.
  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.95),
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  highlight.visible = false;
  gallery.add(highlight);

  // Confession cards.
  interface CardEntry {
    group: THREE.Group;
    mesh: THREE.Mesh;
    canvas: HTMLCanvasElement;
    texture: THREE.CanvasTexture;
    data: XRConfession;
    baseY: number;
    angle: number;
  }
  const cards: CardEntry[] = [];
  const list = opts.confessions.slice(0, perf.profile.contentBudget);
  const n = Math.max(list.length, 1);
  list.forEach((c, i) => {
    const angle = (i / n) * Math.PI * 2;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 384;
    paintCard(canvas, c);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.75),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    const group = new THREE.Group();
    group.position.set(
      Math.sin(angle) * RING_RADIUS,
      EYE,
      -Math.cos(angle) * RING_RADIUS
    );
    group.lookAt(0, EYE, 0);
    group.add(mesh);
    mesh.userData.card = true;
    gallery.add(group);
    cards.push({ group, mesh, canvas, texture, data: c, baseY: EYE, angle });
  });
  const cardMeshes = cards.map((c) => c.mesh);

  // Reaction burst (cheap expanding ring sprite).
  function burst(pos: THREE.Vector3, color: string) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.12, 24), mat);
    ring.position.copy(pos);
    ring.lookAt(camera.position);
    scene.add(ring);
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 600;
      if (t >= 1) {
        scene.remove(ring);
        ring.geometry.dispose();
        mat.dispose();
        return;
      }
      const s = 1 + t * 8;
      ring.scale.set(s, s, s);
      mat.opacity = 0.9 * (1 - t);
      requestAnimationFrame(tick);
    };
    tick();
  }

  function react(entry: CardEntry, reaction: "feel" | "wild") {
    if (reaction === "feel") entry.data.feels += 1;
    else entry.data.wilds += 1;
    paintCard(entry.canvas, entry.data);
    entry.texture.needsUpdate = true;
    const pos = new THREE.Vector3();
    entry.group.getWorldPosition(pos);
    burst(pos, reaction === "feel" ? FEEL : VEIL);
    audio.blip(pos, reaction);
    opts.onReact?.(entry.data.id, reaction);
  }

  // Controllers.
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  const hovered = new Map<number, CardEntry | null>();

  function makeController(index: number) {
    const controller = renderer.xr.getController(index);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: 0xc7a7ff,
        transparent: true,
        opacity: 0.6,
      })
    );
    controller.add(line);
    const pulse = (intensity: number, ms: number) => {
      const src = (controller as unknown as {
        userData?: { inputSource?: XRInputSource };
      }).userData?.inputSource;
      const act = (src?.gamepad as Gamepad & {
        hapticActuators?: Array<{ pulse?: (i: number, d: number) => void }>;
      })?.hapticActuators?.[0];
      act?.pulse?.(intensity, ms);
    };
    controller.addEventListener("selectstart", () => {
      const h = hovered.get(index);
      if (h) {
        react(h, "feel");
        pulse(0.6, 40);
      }
    });
    controller.addEventListener("squeezestart", () => {
      const h = hovered.get(index);
      if (h) {
        react(h, "wild");
        pulse(0.4, 60);
      }
    });
    rig.add(controller);
    return controller;
  }
  const controllers = [makeController(0), makeController(1)];

  function intersectFor(controller: THREE.Object3D): CardEntry | null {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const hits = raycaster.intersectObjects(cardMeshes, false);
    if (!hits.length) return null;
    return cards.find((c) => c.mesh === hits[0].object) ?? null;
  }

  function controllerGamepad(controller: THREE.Object3D): Gamepad | undefined {
    // three stores the input source on the controller after connection.
    const c = controller as unknown as {
      userData?: { inputSource?: XRInputSource };
    };
    return c.userData?.inputSource?.gamepad as Gamepad | undefined;
  }
  controllers.forEach((controller) => {
    controller.addEventListener("connected", (e) => {
      (controller as unknown as { userData: { inputSource: unknown } }).userData.inputSource =
        (e as unknown as { data: unknown }).data;
    });
  });

  // Comfort locomotion: arc teleport + head-anchored snap turn + blink vignette.
  const loco = createLocomotion({
    scene,
    rig,
    camera,
    controllers,
    getGamepad: controllerGamepad,
    accent,
    floorY: 0,
  });

  // Resize.
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Desktop/phone preview interactivity: hover with the pointer and tap a card
  // to Feel it (so the preview isn't passive when you don't have a headset).
  const pointer = new THREE.Vector2(0, 0);
  let pointerActive = false;
  let downX = 0;
  let downY = 0;
  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerActive = true;
  };
  const onPointerDown = (e: PointerEvent) => {
    downX = e.clientX;
    downY = e.clientY;
    // First gesture unlocks the audio context (desktop ambient drone).
    audio.resume();
  };
  const onPointerUp = (e: PointerEvent) => {
    if (renderer.xr.isPresenting) return;
    // Ignore drags (those rotate the camera via OrbitControls).
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cardMeshes, false);
    if (hits.length) {
      const entry = cards.find((c) => c.mesh === hits[0].object);
      if (entry) react(entry, "feel");
    }
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  // Render loop.
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    const presenting = renderer.xr.isPresenting;

    // Adaptive perf watchdog, living environment, and comfort locomotion.
    perf.update(dt, t);
    env.update(dt, t);
    loco.update(dt, presenting);

    // Gentle ambient drift of the gallery.
    gallery.rotation.y += dt * 0.04;
    stars.rotation.y += dt * 0.01;
    title.position.y = 2.7 + Math.sin(t * 0.6) * 0.05;

    // Bob + hover scaling.
    const activeHover = new Set<CardEntry>();
    if (presenting) {
      controllers.forEach((controller, i) => {
        const entry = intersectFor(controller);
        hovered.set(i, entry);
        if (entry) activeHover.add(entry);
      });
    } else {
      // Desktop/phone: hover whatever the pointer is over (center until moved).
      raycaster.setFromCamera(pointerActive ? pointer : new THREE.Vector2(0, 0), camera);
      const hits = raycaster.intersectObjects(cardMeshes, false);
      const entry = hits.length
        ? cards.find((c) => c.mesh === hits[0].object) ?? null
        : null;
      if (entry) activeHover.add(entry);
    }

    cards.forEach((c) => {
      c.group.position.y = c.baseY + Math.sin(t * 0.8 + c.angle * 3) * 0.04;
      const target = activeHover.has(c) ? 1.14 : 1;
      const s = c.group.scale.x + (target - c.group.scale.x) * 0.18;
      c.group.scale.set(s, s, s);
    });

    // Glowing highlight behind the focused card.
    const focused = activeHover.values().next().value as CardEntry | undefined;
    const hlMat = highlight.material as THREE.MeshBasicMaterial;
    if (focused) {
      highlight.visible = true;
      highlight.position.copy(focused.group.position);
      highlight.quaternion.copy(focused.group.quaternion);
      highlight.translateZ(-0.03);
      hlMat.opacity = Math.min(0.4, hlMat.opacity + 0.08);
    } else {
      hlMat.opacity = Math.max(0, hlMat.opacity - 0.08);
      highlight.visible = hlMat.opacity > 0.01;
    }

    if (!presenting) controls.update();
    renderer.render(scene, camera);
  });

  async function isSupported(): Promise<boolean> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) return false;
    try {
      return await xr.isSessionSupported("immersive-vr");
    } catch {
      return false;
    }
  }

  async function enterVR(): Promise<void> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error("WebXR not available");
    const session = await xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });
    renderer.xr.setReferenceSpaceType("local-floor");
    await renderer.xr.setSession(session);
    perf.onSessionStart(session);
    audio.resume();
    opts.onSessionChange?.(true);
    session.addEventListener("end", () => opts.onSessionChange?.(false));
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    window.removeEventListener("resize", onResize);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    controls.dispose();
    env.dispose();
    loco.dispose();
    audio.dispose();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { enterVR, isSupported, dispose };
}
