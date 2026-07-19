import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Coins, Check, Lock } from "lucide-react";
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
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-10 pt-4">
      <div className="mb-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.65rem] font-semibold tracking-tight text-white">Store</h1>
          <p className="text-[13px] text-white/40">Cosmetic accents &amp; flair — never pay-to-win</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/70">
          <Coins className="h-4 w-4 text-veil-300" /> {store.credits}
        </span>
      </div>
      <div className="mb-5 h-px w-full bg-[var(--hairline)]" />

      {store.credits === 0 && (
        <p className="mb-5 text-[13px] leading-relaxed text-white/45">
          Earn credits by moderating (see the <button type="button" className="text-white/75 underline decoration-white/20 hover:text-white" onClick={() => navigate("/apply-mod")}>moderator program</button>). Card top-ups arrive soon.
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
