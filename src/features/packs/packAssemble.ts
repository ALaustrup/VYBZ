/**
 * OR-020 / OR-038 — assemble samples into a measured ZIP (no catalog ingest).
 * Library-sourced blobs use the same measure → WAV path as local drops.
 */

import { dbFromLinear } from "@vybz/processing/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { buildZip, sha256Hex, type ZipEntry } from "@/features/distribution/packageZip";
import {
  PACK_MAKER_VERSION,
  buildPackManifest,
  inferSampleKind,
  packFolderForKind,
  type PackManifestEntry,
  type PackSampleKind,
  type PackSampleMetrics,
} from "@/features/packs/packManifest";

export type AssembledSample = {
  id: string;
  sourceName: string;
  kind: PackSampleKind;
  wavBytes: Uint8Array;
  metrics: PackSampleMetrics;
  sha256: string;
};

function planarFromBuffer(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.push(buf.getChannelData(c).slice());
  }
  return out;
}

function measurePlanar(channels: Float32Array[], sampleRate: number): PackSampleMetrics {
  const n = channels[0]?.length ?? 0;
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (const ch of channels) {
    for (let i = 0; i < n; i++) {
      const s = ch[i]!;
      const a = Math.abs(s);
      if (a > peak) peak = a;
      sumSq += s * s;
      count++;
    }
  }
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
  return {
    peakDbfs: dbFromLinear(peak),
    rmsDbfs: dbFromLinear(rms),
    durationSeconds: sampleRate > 0 ? n / sampleRate : 0,
    sampleRate,
    channels: channels.length,
  };
}

function bufferFromPlanar(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  const ctx = new OfflineAudioContext(Math.max(1, channels.length), Math.max(1, length), sampleRate);
  const buf = ctx.createBuffer(Math.max(1, channels.length), Math.max(1, length), sampleRate);
  for (let c = 0; c < channels.length; c++) {
    buf.getChannelData(c).set(channels[c]!);
  }
  return buf;
}

export async function assembleSampleFromBlob(
  blob: Blob,
  sourceName: string,
): Promise<AssembledSample> {
  const file = new File([blob], sourceName, { type: blob.type || "audio/wav" });
  return assembleSampleFromFile(file);
}

export async function assembleSampleFromFile(file: File): Promise<AssembledSample> {
  const audio = await decodeToBuffer(file);
  const planar = planarFromBuffer(audio);
  const metrics = measurePlanar(planar, audio.sampleRate);
  const wav = encodeWav(bufferFromPlanar(planar, audio.sampleRate));
  const wavBytes = new Uint8Array(await wav.arrayBuffer());
  const sha256 = await sha256Hex(wavBytes);
  return {
    id: crypto.randomUUID(),
    sourceName: file.name,
    kind: inferSampleKind(file.name),
    wavBytes,
    metrics,
    sha256,
  };
}

export async function buildPackZip(opts: {
  title: string;
  samples: AssembledSample[];
}): Promise<{
  zip: Uint8Array;
  manifest: Awaited<ReturnType<typeof buildPackManifest>>;
  zipSha256: string;
}> {
  const entries: PackManifestEntry[] = [];
  const zipEntries: ZipEntry[] = [];
  const used = new Set<string>();

  for (const s of opts.samples) {
    const folder = packFolderForKind(s.kind);
    const base = s.sourceName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 48) || "sample";
    let fileName = `${folder}/${base}.wav`;
    let n = 2;
    while (used.has(fileName)) {
      fileName = `${folder}/${base}_${n}.wav`;
      n++;
    }
    used.add(fileName);
    entries.push({
      fileName,
      sourceName: s.sourceName,
      kind: s.kind,
      metrics: s.metrics,
      sha256: s.sha256,
    });
    zipEntries.push({ path: fileName, bytes: s.wavBytes });
  }

  const manifest = await buildPackManifest({ title: opts.title, samples: entries });
  const manifestJson = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  zipEntries.push({ path: "manifest.json", bytes: manifestJson });
  const zip = buildZip(zipEntries);
  const zipSha256 = await sha256Hex(zip);
  return { zip, manifest, zipSha256 };
}

export { PACK_MAKER_VERSION };
