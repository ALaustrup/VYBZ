import { useEffect } from "react";
import { noteKey, notePointer } from "./hostSignals";

/** Collects pointer/key activity while the host is live. Does not send. */
export function useHostSignals(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onPointer = () => notePointer();
    const onKey = () => noteKey();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}
