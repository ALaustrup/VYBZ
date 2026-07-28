import { useEffect } from "react";
import { useSession } from "@/store/session";
import { resetAmbientRadioGate, startAmbientRadio } from "@/lib/ambientRadio";

/** Boots always-on soundtrack once the user is authenticated. */
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
