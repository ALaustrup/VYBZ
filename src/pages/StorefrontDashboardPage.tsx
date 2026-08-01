import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Plus, Package, ExternalLink } from "lucide-react";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { formatPackPrice, type StorefrontPack, type StorefrontOrder } from "@/features/storefront/types";
import { NexusPageHeader } from "@/components/NexusPageHeader";
import { StorefrontOrdersPanel } from "@/features/storefront/StorefrontOrdersPanel";

type Tab = "packs" | "orders";

export function StorefrontDashboardPage() {
  const { showToast } = useSession();
  const [packs, setPacks] = useState<StorefrontPack[] | null>(null);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [tab, setTab] = useState<Tab>("packs");
  const [settlingId, setSettlingId] = useState<string | null>(null);

  useRegisterAppBar({ title: "Sample Packs" }, []);

  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([
        api.listMyStorefrontPacks(),
        api.listMyStorefrontOrders(),
      ]);
      setPacks(p);
      setOrders(o);
    } catch (e) {
      showToast((e as Error).message);
      setPacks([]);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  async function settleOrder(orderId: string) {
    setSettlingId(orderId);
    try {
      await api.settleStorefrontOrder(orderId);
      showToast("Marked settled off-platform.");
      await load();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSettlingId(null);
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 pb-28 suite-grid suite-grid-dense" data-testid="storefront-dashboard">
      <NexusPageHeader
        eyebrow="Tools"
        title="Sample Pack Storefront"
        subtitle="Upload a pack, generate copy and cover art, publish a storefront. Fans pay VYBZ; you settle manually (ACH / Zelle / Vc) — platform fee 10%."
      />

      <div className="flex gap-2" role="tablist" aria-label="Storefront sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "packs"}
          className={`forge-chip ${tab === "packs" ? "forge-chip--active" : ""}`}
          onClick={() => setTab("packs")}
        >
          Packs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "orders"}
          data-testid="storefront-orders-tab"
          className={`forge-chip ${tab === "orders" ? "forge-chip--active" : ""}`}
          onClick={() => setTab("orders")}
        >
          Orders
        </button>
      </div>

      {tab === "packs" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="nexus-eyebrow">Your packs</h2>
            <Link to="/tools/packs/new" className="forge-cta inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Plus className="h-3.5 w-3.5" /> New pack
            </Link>
          </div>

          {packs.length === 0 ? (
            <div className="forge-card py-12 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-white/30" />
              <p className="text-sm text-white/50">No packs yet. Create your first storefront.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {packs.map((p) => (
                <li
                  key={p.id}
                  className="forge-card flex items-center gap-3 transition hover:border-white/20"
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
                      className="forge-cta-ghost !min-h-8 !px-2 !text-xs"
                      title="Open storefront"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <section className="space-y-3" aria-label="Orders">
          <h2 className="nexus-eyebrow">Orders</h2>
          <StorefrontOrdersPanel
            orders={orders.slice(0, 50)}
            settlingId={settlingId}
            onSettle={(id) => void settleOrder(id)}
          />
        </section>
      )}
    </div>
  );
}
