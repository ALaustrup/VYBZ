import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Coins, Check, Lock, Sparkles } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";
import { Flair } from "@/lib/cosmetics";
import type { Cosmetic, CosmeticPackage, CosmeticStore } from "@/types";

/** Credit top-up packs — 1 Vc = $0.05 USD peg (enforced server-side). */
const CREDIT_PACKS = [
  { id: "starter", dollars: 5, credits: 100, label: "Starter" },
  { id: "plus", dollars: 10, credits: 200, label: "Plus" },
  { id: "pro", dollars: 25, credits: 500, label: "Studio" },
] as const;

/**
 * Legacy cosmetics store — Flair archived from nav.
 * Credit top-up packs and cosmetics live here (Suite UX — not Settings).
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
      showToast("Credits added — dress up your profile!");
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

  async function buyCredits(packId: string) {
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
    try {
      const r = await api.purchaseCosmetic(c.id);
      showToast("Unlocked — looks only, never match rank");
      setStore((s) => s && { ...s, credits: r.credits, owned: [...s.owned, c.id] });
    } catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }

  async function buyPackage(p: CosmeticPackage) {
    setBusy(p.id);
    try {
      const r = await api.purchaseCosmeticPackage(p.id);
      if (r.message) showToast(r.message);
      else showToast(`Pack unlocked · ${r.newItems ?? 0} new items`);
      setStore((s) => s && {
        ...s,
        credits: r.credits,
        owned: r.ownedIds ?? [...new Set([...s.owned, ...p.itemIds])],
      });
      void refreshProfile();
    } catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }

  async function equip(c: Cosmetic) {
    setBusy(c.id);
    try {
      const eq = await api.equipCosmetic(c.id);
      setStore((s) => s && { ...s, equipped: eq });
      await refreshProfile();
      showToast("Equipped — your look, your vibe");
    } catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }

  async function unequip(category: string) {
    try {
      const eq = await api.unequipCosmetic(category);
      setStore((s) => s && { ...s, equipped: eq });
      await refreshProfile();
    } catch (e) { showToast((e as Error).message); }
  }

  if (!store) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }

  const accents = store.catalog.filter((c) => c.category === "accent");
  const flairs = store.catalog.filter((c) => c.category === "flair");
  const frames = store.catalog.filter((c) => c.category === "frame");
  const backdrops = store.catalog.filter((c) => c.category === "backdrop");
  const featured = store.packages.filter((p) => p.featured);
  const otherPacks = store.packages.filter((p) => !p.featured);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-10 pt-2">
      <header className="mb-6">
        <p className="eyebrow mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-veil-300" /> Profile Enhancement
        </p>
        <h1 className="font-display text-2xl font-bold text-white">Make your profile yours</h1>
        <p className="mt-1.5 max-w-md text-sm text-white/50">
          Optional flair, frames, and scenes. Matching, messages, voice, and cam stay free forever —
          cosmetics never buy rank.
        </p>
      </header>

      {(featured.length > 0 || otherPacks.length > 0) && (
        <Group title="Enhancement packages">
          <div className="grid gap-3 sm:grid-cols-2">
            {[...featured, ...otherPacks].map((p) => {
              const ownedAll = p.itemIds.every((id) => store.owned.includes(id));
              const canAfford = store.credits >= p.price;
              return (
                <div
                  key={p.id}
                  className={cx(
                    "rounded-2xl border p-4",
                    p.featured ? "border-veil-400/40 bg-veil-500/[0.08]" : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  {p.featured && (
                    <span className="mb-2 inline-block rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel">
                      Featured
                    </span>
                  )}
                  <p className="font-display text-lg font-bold text-white">{p.name}</p>
                  <p className="mt-1 text-[13px] text-white/55">{p.tagline}</p>
                  <p className="mt-2 text-[11px] text-white/35">{p.itemIds.length} items · looks only</p>
                  {ownedAll ? (
                    <p className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-feel">
                      <Check className="h-3.5 w-3.5" /> You own this pack
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy || !canAfford}
                      onClick={() => void buyPackage(p)}
                      className={cx(
                        "btn mt-3 h-9 w-full py-0 text-[12px] disabled:opacity-50",
                        canAfford ? "btn-primary" : "btn-ghost",
                      )}
                    >
                      {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : !canAfford ? <><Lock className="h-3 w-3" /> {p.price}</>
                        : <><Coins className="h-3.5 w-3.5" /> {p.price}</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Group>
      )}

      <div className="mb-6">
        <p className="eyebrow mb-2">Buy Vc · 1 Vc = $0.05</p>
        <p className="mb-2 text-[11px] text-white/40">
          Credit for use inside VYBZ · not tradeable · no cash-out ·{" "}
          <a href="/legal/vc" className="text-cyan-200/80 underline-offset-2 hover:underline">Whitepaper</a>
          {" · "}
          <a href="/wallet" className="text-cyan-200/80 underline-offset-2 hover:underline">Wallet</a>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CREDIT_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!topupBusy}
              onClick={() => void buyCredits(p.id)}
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
          Optional card top-up. Or earn credits via the{" "}
          <button type="button" className="text-white/60 underline decoration-white/20 hover:text-white" onClick={() => navigate("/apply-mod")}>
            moderator program
          </button>
          . Never required for connection.
        </p>
      </div>

      <Group title="Accents">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accents.map((c) => (
            <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("accent")}>
              <span className="mb-2 block h-12 w-full rounded-xl" style={{ background: `linear-gradient(135deg, ${c.data.c0}, ${c.data.c1})` }} />
            </ItemCard>
          ))}
        </div>
      </Group>

      <Group title="Flair badges">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {flairs.map((c) => (
            <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("flair")}>
              <span className="mb-2 flex h-12 w-full items-center justify-center rounded-xl bg-black/20"><Flair data={c.data} /></span>
            </ItemCard>
          ))}
        </div>
      </Group>

      {frames.length > 0 && (
        <Group title="Frames">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {frames.map((c) => (
              <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("frame")}>
                <span
                  className="mb-2 flex h-12 w-full items-center justify-center rounded-xl bg-black/20"
                  style={{ boxShadow: `inset 0 0 0 ${c.data.ringW ?? 2}px ${c.data.ring ?? "#fff"}` }}
                >
                  <span className="h-8 w-8 rounded-full bg-white/10" />
                </span>
              </ItemCard>
            ))}
          </div>
        </Group>
      )}

      {backdrops.length > 0 && (
        <Group title="Profile scenes">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {backdrops.map((c) => (
              <ItemCard key={c.id} c={c} store={store} busy={busy === c.id} onBuy={() => buy(c)} onEquip={() => equip(c)} onUnequip={() => unequip("backdrop")}>
                <span className="mb-2 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-black/40 text-[11px] font-medium text-white/60">
                  {c.data.bg}
                </span>
              </ItemCard>
            ))}
          </div>
        </Group>
      )}
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
