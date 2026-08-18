import { useEffect } from "react";
import { peekDawBridge } from "@/features/broadcast/dawBridgeSession";
import { finishDeclaredPcmHash, pushDeclaredPcm, startDeclaredPcmHash } from "./declaredPcm";

/** Hash DAW PCM the host already decoded. The digest is declared, not measured. */
export function useDeclaredAudioSha(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    startDeclaredPcmHash();
    const daw = peekDawBridge();
    if (!daw) return () => { finishDeclaredPcmHash(); };
    const unsub = daw.subscribe({
      onPcmFrame: (bytes) => { pushDeclaredPcm(bytes); },
    });
    return () => {
      unsub();
    };
  }, [enabled]);
}

export { finishDeclaredPcmHash };
