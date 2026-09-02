import { useEffect } from "react";
import { useSession } from "@/store/session";
import { resetAmbientRadioGate, startAmbientRadio } from "@/lib/ambientRadio";

/** Seeds a soundtrack queue after auth. Does not start speaker audio. */
export function AmbientRadioHost() {
  const { userId, profile } = useSession();

  useEffect(() => {
    if (!userId || !profile?.username) {
      resetAmbientRadioGate();
      return;
    }
    void startAmbientRadio(userId);
  }, [userId, profile?.username]);

  return null;
}
