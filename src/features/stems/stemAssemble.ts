/**
 * Stem Maker V1 — assemble producer-exported stems into WAV + measured metrics.
 * Optional M6 Correct ops. No catalog ingest. No source separation.
 */

import {
  applyPeakSafety,
  dbFromLinear,
  removeDcOffset,
} from "@vybz/processing/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { buildZip, sha256Hex, type ZipEntry } from "@/features/distribution/packageZip";
import {
  STEM_MAKER_VERSION,
  buildStemManifest,
  inferStemRole,
  stemWavFileName,
  type StemManifestEntry,
  type StemMetricsSnapshot,
} from "@/features/stems/stemManifest";

export type AssembleStemOptions = {
  applyDc?: boolean;
  applyPeakSafety?: boolean;
  role?: string;
};

export type AssembledStem = {
  id: string;
  role: string;
  sourceName: string;
  fileName: string;
  wavBytes: Uint8Array;
  metrics: StemMetricsSnapshot;
  sha256: string;
  corrections: string[];
};

function planarFromBuffer(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.push(buf.getChannelData(c).slice());
  }
  return out;
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

function measurePlanar(channels: Float32Array[], sampleRate: number): StemMetricsSnapshot {
  const n = channels[0]?.length ?? 0;
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c]!;
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

export async function assembleStemFromFile(
  file: File,
  opts: AssembleStemOptions = {}
): Promise<Omit<AssembledStem, "fileName">> {
  const audio = await decodeToBuffer(file);
  let planar = planarFromBuffer(audio);
  const corrections: string[] = [];

  if (opts.applyDc) {
    const r = removeDcOffset(planar);
    planar = r.channels;
    corrections.push(r.correctionVersion);
  }
  if (opts.applyPeakSafety) {
    const r = applyPeakSafety(planar);
    planar = r.channels;
    corrections.push(r.correctionVersion);
  }

  const outBuf = bufferFromPlanar(planar, audio.sampleRate);
  const blob = encodeWav(outBuf);
  const ab = new Uint8Array(await blob.arrayBuffer());
  const metrics = measurePlanar(planar, audio.sampleRate);

  return {
    id: crypto.randomUUID(),
    role: opts.role?.trim() || inferStemRole(file.name),
    sourceName: file.name,
    wavBytes: ab,
    metrics,
    sha256: await sha256Hex(ab),
    corrections,
  };
}

export async function buildStemSetZip(input: {
  title: string;
  stems: AssembledStem[];
}): Promise<{ zip: Uint8Array; manifestJson: string }> {
  const used = new Set<string>();
  const named = input.stems.map((s, i) => ({
    ...s,
    fileName: s.fileName || stemWavFileName(s.role, i, used),
  }));

  const manifestEntries: StemManifestEntry[] = named.map((s) => ({
    role: s.role,
    fileName: s.fileName,
    sourceName: s.sourceName,
    sha256: s.sha256,
    byteLength: s.wavBytes.byteLength,
    metrics: s.metrics,
    corrections: s.corrections,
  }));

  const manifest = buildStemManifest({ title: input.title, stems: manifestEntries });
  const manifestJson = JSON.stringify(manifest, null, 2);
  const entries: ZipEntry[] = [
    { path: "manifest.json", bytes: new TextEncoder().encode(manifestJson) },
    { path: "README.txt", bytes: new TextEncoder().encode(readmeText(manifest.title)) },
    ...named.map((s) => ({ path: `stems/${s.fileName}`, bytes: s.wavBytes })),
  ];

  return { zip: buildZip(entries), manifestJson };
}

function readmeText(title: string): string {
  return [
    `VYBZ Stem Set — ${title}`,
    `Maker ${STEM_MAKER_VERSION}`,
    "",
    "Assembled from producer-exported stem files.",
    "Metrics in manifest.json were measured on-device (Law 1).",
    "This is not AI source separation and not DSP delivery.",
    "Files in this ZIP were not automatically added to the VYBZ Library/catalog.",
    "",
  ].join("\n");
}
