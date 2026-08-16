import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import * as api from "@/lib/api";
import { formatPackPrice } from "./types";

interface PackCheckoutButtonProps {
  packId: string;
  priceCents: number;
  currency?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export function PackCheckoutButton({
  packId,
  priceCents,
  currency = "usd",
  disabled,
  onError,
}: PackCheckoutButtonProps) {
  const [busy, setBusy] = useState(false);

  async function buy() {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const url = await api.startStorefrontCheckout(packId, window.location.origin);
      if (!url) {
        onError?.("Couldn't start pay.");
        return;
      }
      window.location.href = url;
    } catch (e) {
      onError?.((e as Error).message || "Pay failed.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void buy()}
      className="btn btn-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-base font-semibold"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
      Buy {formatPackPrice(priceCents, currency)}
    </button>
  );
}
