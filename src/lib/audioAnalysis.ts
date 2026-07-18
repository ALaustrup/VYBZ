// ---------------------------------------------------------------------------
// Client-side audio analysis: auto BPM + musical key detection (P1 #9).
//
// Runs once on upload against the already-decoded AudioBuffer (no extra decode,
// no network, no cost). Pre-fills the composer's BPM/key so creators don't have
// to type them, and — more importantly — turns every drop into a stronger
// matchmaking signal (tempo-range fit + key overlap). Best-effort: returns null
// when confidence is too low, and the values are always user-overridable.
// ---------------------------------------------------------------------------

export interface AudioAnalysis {
  bpm: number | null;
  key: string | null;
}

/** Downmix to mono and cap to the first `maxSeconds` for bounded, fast analysis. */
function toMono(buffer: AudioBuffer, maxSeconds: number): { data: Float32Array; sr: number } {
  const sr = buffer.sampleRate;
  const len = Math.min(buffer.length, Math.floor(maxSeconds * sr));
  const ch = buffer.numberOfChannels;
  const out = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += d[i] / ch;
  }
  return { data: out, sr };
}

// ── Tempo (BPM) — onset-flux envelope + autocorrelation ─────────────────────
export function detectTempo(buffer: AudioBuffer): number | null {
  const { data, sr } = toMono(buffer, 60);
  if (data.length < sr * 4) return null; // need a few seconds

  const hop = 512;
  const frames = Math.floor(data.length / hop);
  if (frames < 32) return null;
  const env = new Float32Array(frames);
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0;
    const s = f * hop;
    for (let i = 0; i < hop && s + i < data.length; i++) { const v = data[s + i]; e += v * v; }
    e = Math.sqrt(e / hop);
    env[f] = Math.max(0, e - prev); // positive spectral/energy flux = onsets
    prev = e;
  }
  // Remove DC so autocorrelation locks on periodicity, not overall energy.
  let mean = 0;
  for (let i = 0; i < frames; i++) mean += env[i];
  mean /= frames;
  for (let i = 0; i < frames; i++) env[i] -= mean;

  const fps = sr / hop;
  const minLag = Math.max(1, Math.floor((fps * 60) / 180)); // 180 BPM
  const maxLag = Math.min(frames - 1, Math.ceil((fps * 60) / 60)); // 60 BPM
  let bestLag = -1, best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < frames; i++) sum += env[i] * env[i + lag];
    if (sum > best) { best = sum; bestLag = lag; }
  }
  if (bestLag <= 0 || best <= 0) return null;

  let bpm = (60 * fps) / bestLag;
  while (bpm < 70) bpm *= 2;   // fold octaves into a musical range
  while (bpm > 170) bpm /= 2;
  return Math.round(bpm);
}

// ── Musical key — chroma (via FFT) + Krumhansl-Schmuckler correlation ────────
// Key labels match src/lib/profileFields MUSICAL_KEYS exactly.
const KEY_NAMES = ["C", "C# / Db", "D", "D# / Eb", "E", "F", "F# / Gb", "G", "G# / Ab", "A", "A# / Bb", "B"];
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** In-place iterative radix-2 FFT (n must be a power of two). */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k, b = i + k + (len >> 1);
        const vr = re[b] * cr - im[b] * ci;
        const vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] += vr; im[a] += vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function pearson(a: number[] | Float64Array, b: number[]): number {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export function detectKey(buffer: AudioBuffer): string | null {
  const { data, sr } = toMono(buffer, 60);
  const N = 4096, hop = 2048;
  if (data.length < N) return null;

  const chroma = new Float64Array(12);
  const re = new Float32Array(N), im = new Float32Array(N);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  for (let s = 0; s + N <= data.length; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = data[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N >> 1; k++) {
      const freq = (k * sr) / N;
      if (freq < 55 || freq > 2000) continue; // ~A1..B6 fundamental range
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = (((Math.round(midi) % 12) + 12) % 12);
      chroma[pc] += mag;
    }
  }

  let total = 0;
  for (let i = 0; i < 12; i++) total += chroma[i];
  if (total <= 0) return null;
  for (let i = 0; i < 12; i++) chroma[i] /= total;

  let best = -Infinity, bestKey: string | null = null;
  for (let t = 0; t < 12; t++) {
    const maj = KS_MAJOR.map((_, i) => KS_MAJOR[(i - t + 12) % 12]);
    const min = KS_MINOR.map((_, i) => KS_MINOR[(i - t + 12) % 12]);
    const cMaj = pearson(chroma, maj);
    if (cMaj > best) { best = cMaj; bestKey = `${KEY_NAMES[t]} major`; }
    const cMin = pearson(chroma, min);
    if (cMin > best) { best = cMin; bestKey = `${KEY_NAMES[t]} minor`; }
  }
  // Require a minimum correlation so noise/atonal material doesn't guess wildly.
  return best >= 0.55 ? bestKey : null;
}

/** Run both analyses; each is independent and best-effort. */
export function analyzeAudio(buffer: AudioBuffer): AudioAnalysis {
  let bpm: number | null = null;
  let key: string | null = null;
  try { bpm = detectTempo(buffer); } catch { /* best-effort */ }
  try { key = detectKey(buffer); } catch { /* best-effort */ }
  return { bpm, key };
}
