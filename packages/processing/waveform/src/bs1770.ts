/**
 * BS.1770-4 / EBU R128 loudness + Annex 2-style true peak (oversampled).
 *
 * Filter redesign for arbitrary sample rates follows the analog prototypes used by
 * libebur128 (ITU-R BS.1770-4). No third-party runtime dependency (DR-07: in-repo).
 *
 * Provenance is attached so Law 1 consumers can disclose method and limits.
 */

export const BS1770_METER_VERSION = "m4.bs1770.1";
export const TRUE_PEAK_OVERSAMPLE = 4 as const;

export type MeasurementProvenance = {
  standard: "BS.1770-4";
  meterVersion: typeof BS1770_METER_VERSION;
  /** Analysis sample rate (may differ from container if host resampled). */
  sampleRate: number;
  channelCount: number;
  /** True-peak oversampling factor (Annex 2 style). */
  truePeakOversample: typeof TRUE_PEAK_OVERSAMPLE;
  /** Environment that ran the meter. */
  environment: "web-worker" | "portable" | "native-pending";
};

export type Bs1770Metrics = {
  /** Integrated loudness (LUFS), absolute + relative gated per BS.1770-4. */
  integratedLufs: number;
  /** Maximum momentary loudness (400 ms), LUFS. */
  momentaryLufs: number;
  /** Maximum short-term loudness (3 s), LUFS. */
  shortTermLufs: number;
  /** Loudness range (LU) from short-term distribution (EBU Tech 3342 simplified). */
  loudnessRangeLu: number;
  /** Sample peak of the input PCM, dBFS. */
  samplePeakDbfs: number;
  /** True peak via oversampling, dBTP. */
  truePeakDbtp: number;
  provenance: MeasurementProvenance;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function dbFromMs(ms: number): number {
  if (ms <= 1e-20) return -70;
  return -0.691 + 10 * Math.log10(ms);
}

function linearFromDb(db: number): number {
  return Math.pow(10, db / 20);
}

/** Channel weights G_i — front 1.0, surround 1.41, LFE excluded. */
function channelWeight(index: number, channelCount: number): number {
  if (channelCount <= 2) return 1;
  if (index === 3 && channelCount >= 4) return 0;
  if (index >= 2) return 1.41;
  return 1;
}

function designPreFilter(fs: number): Biquad {
  const f0 = 1681.974450955533;
  const G = 3.999843853973347;
  const Q = 0.7071752369554196;
  const K = Math.tan((Math.PI * f0) / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996666474389545);
  const a0 = 1 + K / Q + K * K;
  return {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
}

function designRlbFilter(fs: number): Biquad {
  const f0 = 38.13547080089172;
  const Q = 0.5003270373238773;
  const K = Math.tan((Math.PI * f0) / fs);
  const a0 = 1 + K / Q + K * K;
  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
}

function applyBiquad(input: Float32Array, c: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i]!;
    const y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    out[i] = y;
  }
  return out;
}

function kWeightChannel(samples: Float32Array, fs: number): Float32Array {
  return applyBiquad(applyBiquad(samples, designPreFilter(fs)), designRlbFilter(fs));
}

/**
 * True-peak estimate (Annex 2 style): Catmull–Rom interpolation at `factor`×,
 * then absolute peak. Passband gain is unity — sample peaks are never inflated.
 * Oversample factor is recorded in provenance.
 */
export function measureTruePeakDbtp(channels: Float32Array[], factor: number = TRUE_PEAK_OVERSAMPLE): number {
  let peak = 0;
  for (const ch of channels) {
    if (!ch.length) continue;
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
    }
    if (ch.length < 2 || factor < 2) continue;
    for (let i = 0; i < ch.length - 1; i++) {
      const y0 = ch[i - 1] ?? ch[i]!;
      const y1 = ch[i]!;
      const y2 = ch[i + 1]!;
      const y3 = ch[i + 2] ?? y2;
      const c0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
      const c1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
      const c2 = -0.5 * y0 + 0.5 * y2;
      const c3 = y1;
      for (let k = 1; k < factor; k++) {
        const t = k / factor;
        const s = ((c0 * t + c1) * t + c2) * t + c3;
        const a = Math.abs(s);
        if (a > peak) peak = a;
      }
    }
  }
  if (peak <= 1e-12) return -120;
  return 20 * Math.log10(peak);
}

function samplePeakDbfs(channels: Float32Array[]): number {
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
    }
  }
  if (peak <= 1e-12) return -120;
  return 20 * Math.log10(peak);
}

function blockMeanSquare(
  weighted: Float32Array[],
  weights: number[],
  start: number,
  len: number,
): number {
  let sum = 0;
  let active = 0;
  for (let c = 0; c < weighted.length; c++) {
    const w = weights[c]!;
    if (w <= 0) continue;
    const ch = weighted[c]!;
    let ms = 0;
    for (let i = start; i < start + len; i++) {
      const s = ch[i] ?? 0;
      ms += s * s;
    }
    sum += w * (ms / len);
    active += 1;
  }
  return active > 0 ? sum : 0;
}

export function measureBs1770(
  channels: Float32Array[],
  sampleRate: number,
  environment: MeasurementProvenance["environment"] = "portable",
): Bs1770Metrics {
  const chCount = channels.length;
  const provenance: MeasurementProvenance = {
    standard: "BS.1770-4",
    meterVersion: BS1770_METER_VERSION,
    sampleRate,
    channelCount: chCount,
    truePeakOversample: TRUE_PEAK_OVERSAMPLE,
    environment,
  };
  const empty: Bs1770Metrics = {
    integratedLufs: -70,
    momentaryLufs: -70,
    shortTermLufs: -70,
    loudnessRangeLu: 0,
    samplePeakDbfs: -120,
    truePeakDbtp: -120,
    provenance,
  };
  if (!chCount || sampleRate <= 0) return empty;
  const n = channels[0]?.length ?? 0;
  if (n === 0) return empty;

  const weights = Array.from({ length: chCount }, (_, i) => channelWeight(i, chCount));
  const weighted = channels.map((ch) => kWeightChannel(ch, sampleRate));

  // BS.1770-4: 400 ms gating blocks with 75 % overlap (100 ms hop).
  const blockLen = Math.max(1, Math.round(sampleRate * 0.4));
  const gateHop = Math.max(1, Math.round(sampleRate * 0.1));
  const blocks: number[] = [];
  for (let start = 0; start + blockLen <= n; start += gateHop) {
    blocks.push(blockMeanSquare(weighted, weights, start, blockLen));
  }

  let integrated = -70;
  const aboveAbs = blocks.filter((ms) => dbFromMs(ms) > -70);
  if (aboveAbs.length) {
    const gammaA = aboveAbs.reduce((a, b) => a + b, 0) / aboveAbs.length;
    const relativeThresh = dbFromMs(gammaA) - 10;
    const aboveRel = aboveAbs.filter((ms) => dbFromMs(ms) > relativeThresh);
    const gamma =
      aboveRel.length > 0
        ? aboveRel.reduce((a, b) => a + b, 0) / aboveRel.length
        : gammaA;
    integrated = dbFromMs(gamma);
  }

  const momHop = Math.max(1, Math.round(sampleRate * 0.1));
  let momentary = -70;
  for (let start = 0; start + blockLen <= n; start += momHop) {
    const lu = dbFromMs(blockMeanSquare(weighted, weights, start, blockLen));
    if (lu > momentary) momentary = lu;
  }

  const stLen = Math.max(1, Math.round(sampleRate * 3));
  const stBlocks: number[] = [];
  let shortTerm = -70;
  if (n >= stLen) {
    for (let start = 0; start + stLen <= n; start += momHop) {
      const lu = dbFromMs(blockMeanSquare(weighted, weights, start, stLen));
      stBlocks.push(lu);
      if (lu > shortTerm) shortTerm = lu;
    }
  } else {
    shortTerm = momentary;
  }

  let lra = 0;
  const stAbs = stBlocks.filter((lu) => lu > -70);
  if (stAbs.length >= 2) {
    const meanPow = stAbs.reduce((a, b) => a + Math.pow(10, b / 10), 0) / stAbs.length;
    const rel = 10 * Math.log10(meanPow) - 20;
    const gated = stAbs.filter((lu) => lu > rel).sort((a, b) => a - b);
    if (gated.length >= 2) {
      const p10 = gated[Math.max(0, Math.floor(gated.length * 0.1))]!;
      const p95 = gated[Math.min(gated.length - 1, Math.floor(gated.length * 0.95))]!;
      lra = Math.max(0, p95 - p10);
    }
  }

  return {
    integratedLufs: integrated,
    momentaryLufs: momentary,
    shortTermLufs: shortTerm,
    loudnessRangeLu: lra,
    samplePeakDbfs: samplePeakDbfs(channels),
    truePeakDbtp: measureTruePeakDbtp(channels, TRUE_PEAK_OVERSAMPLE),
    provenance,
  };
}

export function measureBs1770Mono(
  samples: Float32Array,
  sampleRate: number,
  environment: MeasurementProvenance["environment"] = "portable",
): Bs1770Metrics {
  return measureBs1770([samples], sampleRate, environment);
}

/** ITU-style 1 kHz sine at a given peak dBFS (amplitude = 10^(dBFS/20)). */
export function synthesizeSinePeakDbfs(opts: {
  sampleRate: number;
  seconds: number;
  peakDbfs: number;
  freqHz?: number;
  channels?: number;
}): Float32Array[] {
  const freq = opts.freqHz ?? 1000;
  const chN = opts.channels ?? 1;
  const amp = linearFromDb(opts.peakDbfs);
  const n = Math.floor(opts.sampleRate * opts.seconds);
  const out: Float32Array[] = [];
  for (let c = 0; c < chN; c++) {
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      buf[i] = Math.sin((2 * Math.PI * freq * i) / opts.sampleRate) * amp;
    }
    out.push(buf);
  }
  return out;
}
