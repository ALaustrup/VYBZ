import { useSyncExternalStore } from "react";
import {
  getWorkingTrack,
  subscribeWorkingTrack,
  type WorkingTrack,
} from "@/features/workspace/workingSet";

export function useWorkingTrack(): WorkingTrack | null {
  return useSyncExternalStore(subscribeWorkingTrack, getWorkingTrack, () => null);
}
