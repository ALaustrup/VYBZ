/**
 * Android AudioManager focus — native VybzAudioFocus plugin (M9).
 * Domain code must not import this; Platform Bridge binds it to AudioBus.
 */

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type AudioFocusChange =
  | "gain"
  | "loss"
  | "lossTransient"
  | "lossTransientCanDuck"
  | "unknown";

export type AudioFocusChangeEvent = {
  change: AudioFocusChange;
  code: number;
};

type AudioFocusPlugin = {
  isAvailable(): Promise<{ available: boolean; platform: string }>;
  request(): Promise<{ granted: boolean; result: number }>;
  abandon(): Promise<void>;
  addListener(
    eventName: "focusChange",
    listener: (event: AudioFocusChangeEvent) => void,
  ): Promise<PluginListenerHandle>;
};

const NativeAudioFocus = registerPlugin<AudioFocusPlugin>("VybzAudioFocus");

/** Injectable surface for unit tests — production uses Capacitor native plugin. */
export type AudioFocusAdapter = {
  isNativeAndroid(): boolean;
  isAvailable(): Promise<boolean>;
  request(): Promise<boolean>;
  abandon(): Promise<void>;
  onChange(listener: (change: AudioFocusChange) => void): () => void;
};

export function createNativeAudioFocusAdapter(): AudioFocusAdapter {
  return {
    isNativeAndroid() {
      return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
    },
    async isAvailable() {
      if (!this.isNativeAndroid()) return false;
      try {
        const r = await NativeAudioFocus.isAvailable();
        return r.available === true;
      } catch {
        return false;
      }
    },
    async request() {
      if (!this.isNativeAndroid()) return false;
      try {
        const r = await NativeAudioFocus.request();
        return r.granted === true;
      } catch {
        return false;
      }
    },
    async abandon() {
      if (!this.isNativeAndroid()) return;
      try {
        await NativeAudioFocus.abandon();
      } catch {
        /* ignore */
      }
    },
    onChange(listener) {
      if (!this.isNativeAndroid()) return () => undefined;
      let handle: PluginListenerHandle | undefined;
      let cancelled = false;
      void NativeAudioFocus.addListener("focusChange", (event) => {
        listener(event.change);
      }).then((h) => {
        if (cancelled) {
          void h.remove();
          return;
        }
        handle = h;
      });
      return () => {
        cancelled = true;
        void handle?.remove();
      };
    },
  };
}
