/**
 * Phase H — encrypted-chunk WebRTC swarm (MVP).
 * Peers in Realtime topic `swarm:{assetId}` exchange opaque chunks over data
 * channels. Keys / permission stay server-side via swarm_asset_manifest.
 * CDN download remains the fallback when no peers or flag is off.
 */

import { supabase } from "@/lib/supabase";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";

const CHUNK_TIMEOUT_MS = 12_000;
const PEER_WAIT_MS = 4_000;

export interface SwarmManifest {
  assetId: string;
  chunkSize: number | null;
  chunkHashes: string[];
  cipherAlgo: string | null;
  contentKeyEnvelope: unknown;
  byteSize: number;
}

interface Signal {
  from: string;
  type: "hello" | "need" | "offer-sdp" | "answer-sdp" | "ice";
  hasChunks?: boolean;
  index?: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Attempt P2P assembly; returns a blob URL or null to fall back to CDN. */
export async function trySwarmDownload(
  assetId: string,
  selfId: string,
  opts?: { seedOptIn?: boolean; timeoutMs?: number },
): Promise<string | null> {
  if (!FLAGS.swarm || !supabase) return null;

  const manifest = await api.swarmAssetManifest(assetId);
  if (!manifest?.chunkHashes?.length) return null;

  const n = manifest.chunkHashes.length;
  const chunks: (ArrayBuffer | null)[] = Array(n).fill(null);
  const seedOptIn = !!opts?.seedOptIn;

  const topic = `swarm:${assetId}`;
  const ch = supabase.channel(topic, { config: { broadcast: { self: false } } });

  let peerId: string | null = null;
  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  const pcHolder: { current: RTCPeerConnection | null } = { current: null };

  const done = new Promise<string | null>((resolve) => {
    const failTimer = window.setTimeout(() => resolve(null), opts?.timeoutMs ?? CHUNK_TIMEOUT_MS + PEER_WAIT_MS);

    const finish = (url: string | null) => {
      clearTimeout(failTimer);
      resolve(url);
    };

    const send = (payload: Omit<Signal, "from">) => {
      void ch.send({ type: "broadcast", event: "swarm", payload: { ...payload, from: selfId } });
    };

    const maybeAssemble = async () => {
      if (chunks.some((c) => !c)) return;
      const total = chunks.reduce((s, c) => s + (c?.byteLength ?? 0), 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        if (!c) continue;
        out.set(new Uint8Array(c), off);
        off += c.byteLength;
      }
      const blob = new Blob([out], { type: "application/octet-stream" });
      finish(URL.createObjectURL(blob));
    };

    const onMessage = async (ev: MessageEvent) => {
      try {
        if (typeof ev.data === "string") {
          const msg = JSON.parse(ev.data) as { t: string; i?: number };
          if (msg.t === "need" && typeof msg.i === "number" && seedOptIn && chunks[msg.i]) {
            dc?.send(chunks[msg.i]!);
          }
          return;
        }
        if (ev.data instanceof ArrayBuffer) {
          const idx = chunks.findIndex((c) => c === null);
          if (idx >= 0) {
            chunks[idx] = ev.data;
            await maybeAssemble();
            const next = chunks.findIndex((c) => c === null);
            if (next >= 0) dc?.send(JSON.stringify({ t: "need", i: next }));
          }
        }
      } catch { /* ignore */ }
    };

    const openChannel = (channel: RTCDataChannel) => {
      dc = channel;
      channel.binaryType = "arraybuffer";
      channel.onmessage = onMessage;
      channel.onopen = () => {
        const first = chunks.findIndex((c) => c === null);
        if (first >= 0) channel.send(JSON.stringify({ t: "need", i: first }));
      };
    };

    ch.on("broadcast", { event: "swarm" }, async ({ payload }: { payload: Signal }) => {
      if (!payload || payload.from === selfId) return;

      if (payload.type === "hello" && payload.hasChunks && !peerId) {
        peerId = payload.from;
        pc = new RTCPeerConnection({ iceServers: STUN });
        pcHolder.current = pc;
        pc.onicecandidate = (e) => {
          if (e.candidate) send({ type: "ice", candidate: e.candidate.toJSON() });
        };
        const channel = pc.createDataChannel("chunks");
        openChannel(channel);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer-sdp", sdp: offer });
        return;
      }

      if (payload.type === "offer-sdp" && seedOptIn && !pc && payload.sdp) {
        peerId = payload.from;
        pc = new RTCPeerConnection({ iceServers: STUN });
        pcHolder.current = pc;
        pc.onicecandidate = (e) => {
          if (e.candidate) send({ type: "ice", candidate: e.candidate.toJSON() });
        };
        pc.ondatachannel = (e) => openChannel(e.channel);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer-sdp", sdp: answer });
        return;
      }

      if (payload.type === "answer-sdp" && pc && payload.sdp) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)); } catch { /* ignore */ }
        return;
      }

      if (payload.type === "ice" && pc && payload.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { /* ignore */ }
      }
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        send({ type: "hello", hasChunks: seedOptIn && chunks.some(Boolean) });
        window.setTimeout(() => {
          if (!peerId) finish(null);
        }, PEER_WAIT_MS);
      }
    });
  });

  try {
    return await done;
  } finally {
    try { pcHolder.current?.close(); } catch { /* ignore */ }
    void supabase.removeChannel(ch);
  }
}

/** Persist seed preference (local). */
export function swarmSeedOptIn(): boolean {
  try { return localStorage.getItem("vybz.swarm.seed") === "1"; } catch { return false; }
}
export function setSwarmSeedOptIn(on: boolean) {
  try { localStorage.setItem("vybz.swarm.seed", on ? "1" : "0"); } catch { /* ignore */ }
}
