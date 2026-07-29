import { formatPackPrice, type StorefrontOrder } from "@/features/storefront/types";

type Props = {
  orders: StorefrontOrder[];
  settlingId?: string | null;
  onSettle?: (orderId: string) => void;
};

export function StorefrontOrdersPanel({ orders, settlingId, onSettle }: Props) {
  if (orders.length === 0) {
    return <p className="text-sm text-white/40" data-testid="storefront-orders-empty">No orders yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]" data-testid="storefront-orders">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
            <th className="px-4 py-3 font-medium">Buyer</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Settlement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orders.map((o) => {
            const pending = o.settlement_status !== "settled_off_platform";
            return (
              <tr key={o.id} data-testid={`storefront-order-${o.id}`}>
                <td className="px-4 py-3">
                  <div className="truncate text-white/85">{o.buyer_email}</div>
                  <div className="text-xs text-white/40">{new Date(o.created_at).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3 text-white/70">{formatPackPrice(o.amount_cents)}</td>
                <td className={`px-4 py-3 text-xs ${o.status === "paid" ? "text-emerald-300/80" : "text-white/40"}`}>
                  {o.status}
                </td>
                <td className="px-4 py-3">
                  {pending ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-amber-200/80" data-testid="settlement-pending">
                        Pending manual
                      </span>
                      {onSettle && o.status === "paid" && (
                        <button
                          type="button"
                          className="btn btn-ghost px-2 py-1 text-xs"
                          data-testid="settle-now"
                          disabled={settlingId === o.id}
                          onClick={() => onSettle(o.id)}
                        >
                          {settlingId === o.id ? "Settling…" : "Settle now"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-300/80" data-testid="settlement-settled">
                      Settled off-platform
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
