import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Library, Loader2, Package } from "lucide-react";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { StorefrontOrdersPanel } from "@/features/storefront/StorefrontOrdersPanel";
import { formatPackPrice, type StorefrontOrder, type StorefrontPack } from "@/features/storefront/types";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";

/**
 * Stage 8 — library plus sales. Does not replace Library or the storefront
 * dashboard; it is the last step of the guided flow.
 */
export function PackSalesStage() {
  const { showToast, userId } = useSession();
  const [packs, setPacks] = useState<StorefrontPack[] | null>(null);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [trackTotal, setTrackTotal] = useState<number | null>(null);

  useRegisterAppBar({ title: "Make pack", subtitle: "Stage 8 · Sales" }, []);

  const load = useCallback(async () => {
    try {
      if (userId) {
        const total = await api.countDropsBy(userId);
        setTrackTotal(total);
      }
      if (!FLAGS.storefront) {
        setPacks([]);
        setOrders([]);
        return;
      }
      const [p, o] = await Promise.all([api.listMyStorefrontPacks(), api.listMyStorefrontOrders()]);
      setPacks(p);
      setOrders(o);
    } catch (e) {
      showToast((e as Error).message);
      setPacks([]);
    }
  }, [showToast, userId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <ToolWorkbench
      eyebrow="Stage 8"
      title="Library and sales"
      subtitle="Your catalog and what sold. Counts are measured. Enjoyment is Not measured."
      testId="pack-sales-stage"
    >
      <div className="flex flex-wrap gap-2">
        <Link to="/library" className="forge-cta inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
          <Library className="h-3.5 w-3.5" /> Open Library
        </Link>
        {FLAGS.storefront ? (
          <Link to="/tools/packs" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
            <Package className="h-3.5 w-3.5" /> Seller dashboard
          </Link>
        ) : null}
      </div>

      {trackTotal != null ? (
        <p className="text-[12px] text-white/40" data-testid="pack-sales-library-count">
          Library tracks: {trackTotal}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="nexus-eyebrow">Published packs</h2>
        {!FLAGS.storefront ? (
          <p className="text-sm text-white/40">Storefront is off.</p>
        ) : packs == null ? (
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        ) : packs.length === 0 ? (
          <p className="text-sm text-white/40">No packs yet.</p>
        ) : (
          <ul className="space-y-2">
            {packs.map((p) => (
              <li key={p.id} className="forge-card flex items-center justify-between gap-3 !rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/85">{p.title || "Untitled pack"}</p>
                  <p className="text-[11px] text-white/40">
                    {p.status} · {formatPackPrice(p.price_cents, p.currency)}
                  </p>
                </div>
                {p.status === "published" ? (
                  <Link to={`/pack/${p.slug}`} className="text-[11px] text-white/50 hover:text-white">
                    View
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="nexus-eyebrow">Orders</h2>
        {FLAGS.storefront ? (
          <StorefrontOrdersPanel
            orders={orders}
            settlingId={settlingId}
            onSettle={(id) => void settleOrder(id)}
          />
        ) : (
          <p className="text-sm text-white/40">Storefront is off.</p>
        )}
      </section>
    </ToolWorkbench>
  );
}
