import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Coins, Check, Lock } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import { Flair } from "@/lib/cosmetics";
import type { Cosmetic, CosmeticStore } from "@/types";

/**
 * Cosmetic store (Lane B). Purely aesthetic accents + flair, unlocked with
 * credits earned from moderation (Stripe top-ups arrive with Lane A). Nothing
 * functional is ever gated here.
 */
export function StorePage() {
  const { refreshProfile, showToast } = useSession();
  const navigate = useNavigate();
  const [store, setStore] = useState<CosmeticStore | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => { setStore(await api.listCosmetics()); }, []);
  useEffect(() => { void load(); }, [load]);

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
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10 pt-3">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-gradient"><Sparkles className="h-5 w-5 text-veil-300" /> Cosmetic store</h1>
          <p className="text-[12px] text-white/45">Make your profile yours. Purely cosmetic — never pay-to-win.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-aqua-400/15 px-3 py-1.5 text-sm font-bold text-aqua-200 ring-1 ring-aqua-400/30">
          <Coins className="h-4 w-4" /> {store.credits}
        </span>
      </div>

      {store.credits === 0 && (
        <p className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-white/60">
          Earn <span className="font-semibold text-aqua-200">credits</span> by moderating (see the <button className="underline" onClick={() => navigate("/apply-mod")}>moderator program</button>). Buying credits with card arrives soon.
        </p>
      )}

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
  return <div className="mb-6"><p className="mb-2.5 text-[11px] uppercase tracking-wider text-white/40">{title}</p>{children}</div>;
}

function ItemCard({ c, store, busy, onBuy, onEquip, onUnequip, children }: {
  c: Cosmetic; store: CosmeticStore; busy: boolean; onBuy: () => void; onEquip: () => void; onUnequip: () => void; children: React.ReactNode;
}) {
  const owned = store.owned.includes(c.id);
  const equipped = store.equipped[c.category] === c.id;
  const canAfford = store.credits >= c.price;
  return (
    <div className={cx("rounded-2xl border p-3", equipped ? "border-veil-400/50 bg-veil-500/[0.08]" : "border-white/8 bg-white/[0.03]")}>
      {children}
      <p className="truncate text-[13px] font-semibold text-white">{c.name}</p>
      {equipped ? (
        <button onClick={onUnequip} className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-full bg-veil-500/25 py-1.5 text-[12px] font-semibold text-veil-100 active:scale-95">
          <Check className="h-3.5 w-3.5" /> Equipped
        </button>
      ) : owned ? (
        <button onClick={onEquip} disabled={busy} className="mt-1.5 w-full rounded-full bg-white/[0.08] py-1.5 text-[12px] font-semibold text-white/85 active:scale-95 disabled:opacity-50">
          {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Equip"}
        </button>
      ) : (
        <button onClick={onBuy} disabled={busy || !canAfford}
          className={cx("mt-1.5 flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[12px] font-semibold active:scale-95 disabled:opacity-50",
            canAfford ? "bg-aqua-400/20 text-aqua-200" : "bg-white/[0.05] text-white/40")}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : !canAfford ? <><Lock className="h-3 w-3" /> {c.price}</> : <><Coins className="h-3.5 w-3.5" /> {c.price}</>}
        </button>
      )}
    </div>
  );
}
