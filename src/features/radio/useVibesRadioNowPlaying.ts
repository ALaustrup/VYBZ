import { useSyncExternalStore } from "react";
import {
  getVibesRadioSync,
  subscribeVibesRadio,
  type VibesRadioSync,
} from "@/features/radio/vibesRadio";

export function useVibesRadioNowPlaying(): VibesRadioSync | null {
  return useSyncExternalStore(subscribeVibesRadio, getVibesRadioSync, () => null);
}
