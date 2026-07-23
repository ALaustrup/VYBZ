import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Coins, Check, Lock } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";
import { Flair } from "@/lib/cosmetics";
import type { Cosmetic, CosmeticStore } from "@/types";

/** Display-only pack labels — amounts/credits enforced server-side. */
const PACKS = [
  { id: "starter", dollars: 5, credits: 50, label: "Starter" },
  { id: "plus", dollars: 10, credits: 120, label: "Plus" },
  { id: "pro", dollars: 25, credits: 350, label: "Pro" },
] as const;

/**
 * Cosmetic store (Lane B). Purely aesthetic accents + flair, unlocked with
 * credits from moderation or Stripe card top-ups (Lane A). Nothing functional
 * is ever gated here.
 */
export function StorePage() {
  const { refreshProfile, showToast } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [store, setStore] = useState<CosmeticStore | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [topupBusy, setTopupBusy] = useState<string | null>(null);

  const load = useCallback(async () => { setStore(await api.listCosmetics()); }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const topup = params.get("topup");
    if (!topup) return;
    if (topup === "success") {
      showToast("Credits added — thanks!");
      void load();
      void refreshProfile();
    } else if (topup === "cancel") {
      showToast("Top-up canceled.");
    }
    const next = new URLSearchParams(params);
    next.delete("topup");
    setParams(next, { replace: true });
  }, [params, setParams, showToast, load, refreshProfile]);

  useRegisterAppBar({
    actions: store ? (
      <span className="flex items-center gap-1.5 px-1 text-sm font-medium text-white/70">
        <Coins className="h-4 w-4 text-veil-300" /> {store.credits}
      </span>
    ) : null,
  }, [store?.credits]);

  async function buyPack(packId: string) {
    setTopupBusy(packId);
    try {
      const url = await api.startCreditTopup(packId, window.location.origin);
      if (url) { window.location.href = url; return; }
      showToast("Could not start checkout.");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setTopupBusy(null);
    }
  }

  async function buy(c: Cosmetic) {
    setBusy(c.id);
    try { const r = await api.purchaseCosmetic(c.id); showToast("Unlocked!"); setStore((s) => s && { ...s, credits: r.credits, owned: [...s.owned, c.id] }); }
    catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }
  async function equip(c: Cosmetic) {
    setBusy(c.id);
    try { const eq = await api.equipCosmetic(c.id); setStore((s) => s && { ...s, equipped: eq }); await refreshProfile(); }
    catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }
  async function unequip(category: string) {
    try { const eq = await api.unequipCosmetic(category); setStore((s) => s && { ...s, equipped: eq }); await refreshProfile(); }
    catch (e) { showToast((e as Error).message); }
  }

  if (!store) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;

  const accents = store.catalog.filter((c) => c.category === "accent");
  const flairs = store.catalog.filter((c) => c.category === "flair");

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-10 pt-2">
      <div className="mb-5">
        <p className="eyebrow mb-2">Buy credits</p>
        <div className="grid grid-cols-3 gap-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!topupBusy}
              onClick={() => void buyPack(p.id)}
              className={cx(
                "rounded-2xl border border-veil-400/35 bg-veil-500/[0.08] px-2 py-3 text-center transition active:scale-[0.98] disabled:opacity-50",
                topupBusy === p.id && "ring-1 ring-veil-300/50",
              )}
            >
              {topupBusy === p.id ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-veil-200" />
              ) : (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{p.label}</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-white">${p.dollars}</p>
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-[12px] text-veil-200">
                    <Coins className="h-3 w-3" /> {p.credits}
                  </p>
                </>
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-white/35">
          Optional card top-up for accents and flair. Or earn credits via the{" "}
          <button type="button" className="text-white/60 underline decoration-white/20 hover:text-white" onClick={() => navigate("/apply-mod")}>
            moderator program
          </button>
          .
        </p>
      </div>

      <Group title="Profile accents">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accents.map((c) => (
            <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("accent")}>
              <span className="mb-2 block h-12 w-full rounded-xl" style={{ background: `linear-gradient(135deg, ${c.data.c0}, ${c.data.c1})` }} />
            </ItemCard>
          ))}
        </div>
      </Group>

      <Group title="Flair">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {flairs.map((c) => (
            <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("flair")}>
              <span className="mb-2 flex h-12 w-full items-center justify-center rounded-xl bg-black/20"><Flair data={c.data} /></span>
            </ItemCard>
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-6"><p className="eyebrow mb-3">{title}</p>{children}</div>;
}

function ItemCard({ c, store, busy, onBuy, onEquip, onUnequip, children }: {
  c: Cosmetic; store: CosmeticStore; busy: boolean; onBuy: () => void; onEquip: () => void; onUnequip: () => void; children: React.ReactNode;
}) {
  const owned = store.owned.includes(c.id);
  const equipped = store.equipped[c.category] === c.id;
  const canAfford = store.credits >= c.price;
  return (
    <div className={cx("rounded-xl border p-3", equipped ? "border-veil-400/40 bg-veil-500/[0.06]" : "border-[var(--hairline)] bg-white/[0.02]")}>
      {children}
      <p className="truncate text-[13px] font-medium text-white">{c.name}</p>
      {equipped ? (
        <button type="button" onClick={onUnequip} className="btn btn-primary mt-2 h-8 w-full py-0 text-[12px]">
          <Check className="h-3.5 w-3.5" /> Equipped
        </button>
      ) : owned ? (
        <button type="button" onClick={onEquip} disabled={busy} className="btn btn-ghost mt-2 h-8 w-full py-0 text-[12px] disabled:opacity-50">
          {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Equip"}
        </button>
      ) : (
        <button type="button" onClick={onBuy} disabled={busy || !canAfford}
          className={cx("btn mt-2 h-8 w-full py-0 text-[12px] disabled:opacity-50", canAfford ? "btn-primary" : "btn-ghost")}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : !canAfford ? <><Lock className="h-3 w-3" /> {c.price}</> : <><Coins className="h-3.5 w-3.5" /> {c.price}</>}
        </button>
      )}
    </div>
  );
}
