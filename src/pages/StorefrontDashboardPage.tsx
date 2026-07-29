import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Plus, Package, ExternalLink } from "lucide-react";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { formatPackPrice, type StorefrontPack, type StorefrontOrder } from "@/features/storefront/types";

export function StorefrontDashboardPage() {
  const { showToast } = useSession();
  const [packs, setPacks] = useState<StorefrontPack[] | null>(null);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [payout, setPayout] = useState<{ hasAccount: boolean; chargesEnabled: boolean } | null>(null);

  useRegisterAppBar({ title: "Sample Packs" }, []);

  const load = useCallback(async () => {
    try {
      const [p, o, pay] = await Promise.all([
        api.listMyStorefrontPacks(),
        api.listMyStorefrontOrders(),
        api.myPayoutStatus(),
      ]);
      setPacks(p);
      setOrders(o);
      setPayout(pay);
    } catch (e) {
      showToast((e as Error).message);
      setPacks([]);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  async function connectPayouts() {
    try {
      const url = await api.startPayoutOnboarding(window.location.origin);
      if (url) window.location.href = url;
      else showToast("Could not start payout onboarding.");
    } catch (e) {
      showToast((e as Error).message);
    }
  }

  if (!packs) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 pb-28">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Sample Pack Storefront</h1>
        <p className="text-sm text-white/55">
          Upload a pack, generate copy and cover art, publish a storefront. Fans pay via Stripe — you keep 90%.
        </p>
      </header>

      {payout && !payout.chargesEnabled && (
        <div className="glass-chip rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
          <p className="mb-2">Connect Stripe payouts before publishing packs.</p>
          <button type="button" className="btn btn-primary px-3 py-1.5 text-xs" onClick={() => void connectPayouts()}>
            {payout.hasAccount ? "Finish payout setup" : "Connect Stripe"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/45">Your packs</h2>
        <Link to="/tools/packs/new" className="btn btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> New pack
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-white/30" />
          <p className="text-sm text-white/50">No packs yet. Create your first storefront.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {packs.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20"
            >
              <Link to={`/tools/packs/${p.id}/edit`} className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{p.title || "Untitled pack"}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-white/40">
                  <span className={p.status === "published" ? "text-emerald-300/80" : ""}>{p.status}</span>
                  <span>{formatPackPrice(p.price_cents, p.currency)}</span>
                  {p.genre && <span>{p.genre}</span>}
                </div>
              </Link>
              {p.status === "published" && (
                <Link
                  to={`/pack/${p.slug}`}
                  className="btn btn-ghost px-2 py-1 text-xs"
                  title="Open storefront"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/45">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-white/40">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
            {orders.slice(0, 20).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate text-white/85">{o.buyer_email}</div>
                  <div className="text-xs text-white/40">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-white/70">{formatPackPrice(o.amount_cents)}</div>
                  <div className={o.status === "paid" ? "text-emerald-300/80" : "text-white/40"}>{o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
