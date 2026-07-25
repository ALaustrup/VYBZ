/**
 * Tricolor voice occupancy — max 3 concurrent speakers (Green / Yellow / Pink).
 * Visual-first: 3s silence frees a slot and promotes lower ranks.
 */

export type VoiceSlotColor = "green" | "yellow" | "pink";

export interface VoiceSpeaker {
  id: string;
  name: string;
}

export interface VoiceSlotSnapshot {
  green: VoiceSpeaker | null;
  yellow: VoiceSpeaker | null;
  pink: VoiceSpeaker | null;
  /** Participant id → slot color while occupied */
  byId: Record<string, VoiceSlotColor>;
}

const COLORS: VoiceSlotColor[] = ["green", "yellow", "pink"];
const SILENCE_MS = 3000;

export const EMPTY_VOICE_SLOTS: VoiceSlotSnapshot = {
  green: null,
  yellow: null,
  pink: null,
  byId: {},
};

export function voiceSlotHex(color: VoiceSlotColor): string {
  switch (color) {
    case "green": return "#34d399";
    case "yellow": return "#fbbf24";
    case "pink": return "#f472b6";
  }
}

/**
 * Stateful slot manager. Call `noteSpeaking` when LiveKit reports activity;
 * call `tick(now)` on an interval / rAF to apply silence cooldowns.
 */
export class VoiceSlotManager {
  private order: VoiceSpeaker[] = [];
  private lastActive = new Map<string, number>();
  private names = new Map<string, string>();

  noteSpeaking(id: string, name: string, now = Date.now()) {
    if (!id) return;
    this.names.set(id, name || id.slice(0, 8));
    this.lastActive.set(id, now);
    if (!this.order.some((s) => s.id === id)) {
      if (this.order.length < 3) {
        this.order.push({ id, name: this.names.get(id)! });
      }
      // 4th+ waits until a slot frees — visual only
    } else {
      const row = this.order.find((s) => s.id === id);
      if (row) row.name = this.names.get(id)!;
    }
  }

  /** Mark many active speakers (highest energy first from LiveKit). */
  noteActiveSpeakers(list: VoiceSpeaker[], now = Date.now()) {
    for (const s of list) this.noteSpeaking(s.id, s.name, now);
  }

  tick(now = Date.now()): VoiceSlotSnapshot {
    // Drop silent occupants past cooldown
    this.order = this.order.filter((s) => {
      const last = this.lastActive.get(s.id) ?? 0;
      return now - last < SILENCE_MS;
    });

    // Promote: keep order (earliest still-talking stays green)
    const byId: Record<string, VoiceSlotColor> = {};
    const snap: VoiceSlotSnapshot = { green: null, yellow: null, pink: null, byId };
    for (let i = 0; i < this.order.length && i < 3; i++) {
      const color = COLORS[i];
      const sp = this.order[i];
      snap[color] = sp;
      byId[sp.id] = color;
    }
    return snap;
  }

  reset() {
    this.order = [];
    this.lastActive.clear();
    this.names.clear();
  }
}
