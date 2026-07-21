import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Heart, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import { useSession } from "@/store/session";

/**
 * Creator payout onboarding (Stripe Connect, Phase O3b). Lets a creator enable
 * tips; redirects to Stripe's hosted onboarding and re-syncs status on return.
 * Optional — never gates anything.
 */
export function PayoutSetup() {
  const { showToast } = useSession();
  const [status, setStatus] = useState<{ hasAccount: boolean; chargesEnabled: boolean; detailsSubmitted: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { if (FLAGS.tips) api.myPayoutStatus().then(setStatus).catch(() => {}); }, []);

  useEffect(() => {
    const p = searchParams.get("payouts");
    if (p === "done" || p === "refresh") {
      api.refreshPayoutStatus(window.location.origin).then((s) => {
        setStatus(s);
        showToast(s.chargesEnabled ? "Tips enabled — supporters can now tip you." : "Payout setup saved. Finish any remaining steps to enable tips.");
      }).catch(() => {});
      searchParams.delete("payouts"); setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function enable() {
    setBusy(true);
    try {
      const url = await api.startPayoutOnboarding(window.location.origin);
      if (url) { window.location.href = url; return; }
      setBusy(false); showToast("Could not start onboarding.");
    } catch (e) { setBusy(false); showToast((e as Error).message); }
  }

  if (!FLAGS.tips || !status) return null;

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-feel" />
        <p className="flex-1 font-display text-sm font-bold text-white">Tips from supporters</p>
        {status.chargesEnabled && (
          <span className="flex items-center gap-1 rounded-full bg-feel/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel"><Check className="h-3 w-3" /> Enabled</span>
        )}
      </div>
      <p className="mt-1 text-[13px] leading-snug text-white/55">
        {status.chargesEnabled
          ? "Patrons and fans can tip you for tracks, mixes, and collabs — settles to your Stripe account."
          : "Let supporters tip you for music work via Stripe. Optional — never gates features."}
      </p>
      {!status.chargesEnabled && (
        <button onClick={enable} disabled={busy} className="btn btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (status.hasAccount ? "Finish payout setup" : "Enable tips")}
        </button>
      )}
    </div>
  );
}
