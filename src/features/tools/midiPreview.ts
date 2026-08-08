/**
 * Lightweight Midi Maker preview — AudioContext oscillators, no Tone.js runtime.
 */

export type PreviewNote = {
  midi: number;
  time: number;
  duration: number;
  /** 0..1 */
  velocity: number;
};

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type MidiPreviewHandle = {
  stop: () => void;
};

/**
 * Schedule notes on a fresh (or provided) AudioContext. Returns a stop handle
 * that disconnects oscillators and closes the context when we created it.
 */
export function playMidiPreview(
  notes: PreviewNote[],
  opts: { tempoBpm?: number; context?: AudioContext } = {}
): MidiPreviewHandle {
  const ctx = opts.context ?? new AudioContext();
  const ownsContext = !opts.context;
  const t0 = ctx.currentTime + 0.05;
  const nodes: OscillatorNode[] = [];
  let ended = false;

  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  for (const n of notes) {
    const start = t0 + Math.max(0, n.time);
    const dur = Math.max(0.05, n.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vel = Math.max(0.05, Math.min(1, n.velocity));
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(n.midi);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2 * vel, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    nodes.push(osc);
  }

  const stop = () => {
    if (ended) return;
    ended = true;
    for (const osc of nodes) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    }
    try {
      master.disconnect();
    } catch {
      /* */
    }
    if (ownsContext) {
      void ctx.close();
    }
  };

  const lastEnd =
    notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0) + 0.1;
  const timer = window.setTimeout(stop, Math.ceil(lastEnd * 1000) + 80);
  return {
    stop: () => {
      window.clearTimeout(timer);
      stop();
    },
  };
}
