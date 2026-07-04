// MYVYB XR — multiplayer presence.
//
// A shared social layer so you're never alone in the Vybeverse: each client
// broadcasts its head pose over a Supabase Realtime channel (~10 Hz), and every
// other person appears as a glowing avatar — head + gaze visor, an upright
// presence pillar, and a floating name — smoothly interpolated. Reactions ripple
// out from whoever cast them. Fully additive + guarded: with no backend/session
// it simply no-ops and you get the original solo experience.

import * as THREE from "three";
import { supabase } from "@/lib/supabase";

export interface XRIdentity {
  id: string;
  name: string;
  /** Avatar accent hex, e.g. "#8b4ff2". */
  color: string;
}

export interface PresenceHandle {
  group: THREE.Group;
  setLocalPose: (pos: THREE.Vector3, quat: THREE.Quaternion) => void;
  broadcastReaction: (pos: THREE.Vector3, kind: "feel" | "wild") => void;
  update: (dt: number) => void;
  count: () => number;
  dispose: () => void;
}

interface PosePayload {
  id: string;
  name: string;
  color: string;
  p: [number, number, number];
  q: [number, number, number, number];
}

interface Remote {
  id: string;
  name: string;
  color: string;
  targetPos: THREE.Vector3;
  targetQuat: THREE.Quaternion;
  root: THREE.Group;
  headGroup: THREE.Group;
  last: number;
  disposables: Array<THREE.Material | THREE.BufferGeometry | THREE.Texture>;
}

const STALE_MS = 9000;
const SEND_MS = 100;

function makeNameSprite(name: string, color: string): {
  sprite: THREE.Sprite;
  texture: THREE.Texture;
  material: THREE.SpriteMaterial;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(8,9,14,0.7)";
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.arcTo(254, 2, 254, 62, r);
  ctx.arcTo(254, 62, 2, 62, r);
  ctx.arcTo(2, 62, 2, 2, r);
  ctx.arcTo(2, 2, 254, 2, r);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = "600 30px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(name.slice(0, 16), 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.15, 1);
  sprite.position.set(0, 0.34, 0);
  return { sprite, texture, material };
}

function makeAvatar(color: string, name: string): Remote {
  const c = new THREE.Color(color);
  const root = new THREE.Group();
  const headGroup = new THREE.Group();
  root.add(headGroup);
  const disposables: Remote["disposables"] = [];

  const headGeo = new THREE.SphereGeometry(0.12, 20, 16);
  const headMat = new THREE.MeshBasicMaterial({ color: c });
  const head = new THREE.Mesh(headGeo, headMat);
  headGroup.add(head);
  disposables.push(headGeo, headMat);

  const haloGeo = new THREE.SphereGeometry(0.19, 20, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  headGroup.add(new THREE.Mesh(haloGeo, haloMat));
  disposables.push(haloGeo, haloMat);

  // Gaze visor — a dark bar on the face (-Z) so you can read where they look.
  const visorGeo = new THREE.PlaneGeometry(0.16, 0.05);
  const visorMat = new THREE.MeshBasicMaterial({
    color: 0x0a0b0f,
    transparent: true,
    opacity: 0.85,
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.01, -0.121);
  headGroup.add(visor);
  disposables.push(visorGeo, visorMat);

  // Upright presence pillar (stays vertical regardless of head tilt).
  const bodyGeo = new THREE.ConeGeometry(0.16, 0.5, 20, 1, true);
  const bodyMat = new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, -0.34, 0); // apex up, toward the head
  root.add(body);
  disposables.push(bodyGeo, bodyMat);

  const { sprite, texture, material } = makeNameSprite(name, color);
  root.add(sprite);
  disposables.push(texture, material);

  return {
    id: "",
    name,
    color,
    targetPos: new THREE.Vector3(),
    targetQuat: new THREE.Quaternion(),
    root,
    headGroup,
    last: performance.now(),
    disposables,
  };
}

export function createPresence(
  me: XRIdentity,
  opts?: { room?: string; onCount?: (n: number) => void }
): PresenceHandle {
  const group = new THREE.Group();
  const remotes = new Map<string, Remote>();
  const localPos = new THREE.Vector3();
  const localQuat = new THREE.Quaternion();
  let hasLocal = false;
  let lastSend = 0;
  let ready = false;

  // No backend → solo mode (fully functional, just no other people).
  const client = supabase;
  if (!client) {
    return {
      group,
      setLocalPose: () => {},
      broadcastReaction: () => {},
      update: () => {},
      count: () => 1,
      dispose: () => {},
    };
  }

  const emitCount = () => opts?.onCount?.(remotes.size + 1);

  const channel = client.channel(`xr-lounge:${opts?.room ?? "main"}`, {
    config: { broadcast: { self: false }, presence: { key: me.id } },
  });

  function upsertRemote(payload: PosePayload) {
    if (payload.id === me.id) return;
    let r = remotes.get(payload.id);
    if (!r) {
      r = makeAvatar(payload.color, payload.name);
      r.id = payload.id;
      remotes.set(payload.id, r);
      group.add(r.root);
      emitCount();
    }
    r.targetPos.set(payload.p[0], payload.p[1], payload.p[2]);
    r.targetQuat.set(payload.q[0], payload.q[1], payload.q[2], payload.q[3]);
    r.last = performance.now();
  }

  function removeRemote(id: string) {
    const r = remotes.get(id);
    if (!r) return;
    group.remove(r.root);
    r.disposables.forEach((d) => d.dispose());
    remotes.delete(id);
    emitCount();
  }

  // Expanding ring ripple for a remote reaction (self-managed lifetime).
  function ripple(pos: [number, number, number], color: string) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const geo = new THREE.RingGeometry(0.05, 0.11, 24);
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(pos[0], pos[1], pos[2]);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 650;
      if (t >= 1) {
        group.remove(ring);
        geo.dispose();
        mat.dispose();
        return;
      }
      const s = 1 + t * 9;
      ring.scale.set(s, s, s);
      mat.opacity = 0.85 * (1 - t);
      requestAnimationFrame(tick);
    };
    tick();
  }

  channel
    .on("broadcast", { event: "pose" }, ({ payload }) =>
      upsertRemote(payload as PosePayload)
    )
    .on("broadcast", { event: "react" }, ({ payload }) => {
      const p = payload as { p: [number, number, number]; color: string; id: string };
      if (p.id !== me.id) ripple(p.p, p.color);
    })
    .on("presence", { event: "leave" }, ({ leftPresences }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (leftPresences as any[]).forEach((lp) => {
        const id = lp?.id ?? lp?.key;
        if (id) removeRemote(id);
      });
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        ready = true;
        try {
          await channel.track({ id: me.id, name: me.name, color: me.color });
        } catch {
          /* ignore */
        }
      }
    });

  function setLocalPose(pos: THREE.Vector3, quat: THREE.Quaternion) {
    localPos.copy(pos);
    localQuat.copy(quat);
    hasLocal = true;
  }

  function broadcastReaction(pos: THREE.Vector3, kind: "feel" | "wild") {
    if (!ready) return;
    void channel.send({
      type: "broadcast",
      event: "react",
      payload: {
        id: me.id,
        kind,
        color: me.color,
        p: [pos.x, pos.y, pos.z],
      },
    });
  }

  function update(dt: number) {
    const now = performance.now();

    // Broadcast our head pose (throttled) once we have one.
    if (ready && hasLocal && now - lastSend > SEND_MS) {
      lastSend = now;
      void channel.send({
        type: "broadcast",
        event: "pose",
        payload: {
          id: me.id,
          name: me.name,
          color: me.color,
          p: [localPos.x, localPos.y, localPos.z],
          q: [localQuat.x, localQuat.y, localQuat.z, localQuat.w],
        } as PosePayload,
      });
    }

    // Interpolate + prune remotes.
    const k = Math.min(1, dt * 10);
    remotes.forEach((r, id) => {
      if (now - r.last > STALE_MS) {
        removeRemote(id);
        return;
      }
      r.root.position.lerp(r.targetPos, k);
      r.headGroup.quaternion.slerp(r.targetQuat, k);
    });
  }

  function dispose() {
    try {
      client?.removeChannel(channel);
    } catch {
      /* ignore */
    }
    remotes.forEach((r) => {
      group.remove(r.root);
      r.disposables.forEach((d) => d.dispose());
    });
    remotes.clear();
  }

  return { group, setLocalPose, broadcastReaction, update, count: () => remotes.size + 1, dispose };
}
