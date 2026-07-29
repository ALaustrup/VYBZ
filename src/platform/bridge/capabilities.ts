import type { PlatformKind, ProcessingCapabilities } from "@/contracts";

/** Default capability matrix per shell — refine as engines ship. */
export const CAPABILITY_REGISTRY: Record<PlatformKind, ProcessingCapabilities> = {
  web: {
    portableAudioInspect: true,
    portableArtworkInspect: true,
    nativeBatchAudio: false,
    nativeTranscode: false,
    remoteJobs: true,
    maxLocalFileBytes: 200 * 1024 * 1024,
    offlineDrafts: true,
  },
  desktop: {
    portableAudioInspect: true,
    portableArtworkInspect: true,
    nativeBatchAudio: true,
    nativeTranscode: true,
    remoteJobs: true,
    maxLocalFileBytes: 4 * 1024 * 1024 * 1024,
    offlineDrafts: true,
  },
  android: {
    portableAudioInspect: true,
    portableArtworkInspect: true,
    nativeBatchAudio: false,
    nativeTranscode: false,
    remoteJobs: true,
    maxLocalFileBytes: 500 * 1024 * 1024,
    offlineDrafts: true,
  },
};

export function capabilitiesFor(kind: PlatformKind): ProcessingCapabilities {
  return { ...CAPABILITY_REGISTRY[kind] };
}
