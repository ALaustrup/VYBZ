import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Lock, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { cx } from "@/lib/utils";

interface CreditsShopProps {
  open: boolean;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  font: "Font",
  border: "Border",
  theme: "Theme",
  animation: "Animation",
  flair: "Flair",
};

/**
 * Spend V¢ on cosmetic unlocks. (Applying cosmetics across cards/profile lands
 * with the profiles revamp; this is the earn→spend loop + ownership.)
 */
export function CreditsShop({ open, onClose }: CreditsShopProps) {
  const { credits, buyCosmetic, cosmeticLoadout, equipCosmetic } = useApp();
  const [items, setItems] = useState<backend.CosmeticRow[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void backend.fetchCosmetics().then(setItems);
    void backend.fetchOwnedCosmetics().then(setOwned);
  }, [open]);

  async function buy(item: backend.CosmeticRow) {
    setBusy(item.item_id);
    const ok = await buyCosmetic(item.item_id, item.price);
    if (ok) setOwned((o) => [...o, item.item_id]);
    setBusy(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[58] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[58] mx-auto flex max-h-[88%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-lg font-bold text-white">Shop</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1 text-sm font-bold text-amber-200">
                  <Coins className="h-4 w-4" /> {credits} V¢
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="no-scrollbar grid grid-cols-2 gap-3 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {items.map((item) => {
                const have = owned.includes(item.item_id);
                const afford = credits >= item.price;
                const equipped = cosmeticLoadout[item.kind] === item.item_id;
                return (
                  <div
                    key={item.item_id}
                    className={cx(
                      "rounded-2xl border p-3",
                      equipped ? "border-veil-400/50 bg-veil-500/10" : "border-white/8 bg-white/[0.03]"
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-white/35">
                      {KIND_LABEL[item.kind] ?? item.kind}
                    </p>
                    <p className="mb-2 font-display text-sm font-semibold text-white">
                      {item.name}
                    </p>
                    {have ? (
                      <button
                        onClick={() => equipCosmetic(item.kind, equipped ? null : item.item_id)}
                        className={cx(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition active:scale-95",
                          equipped ? "bg-veil-500 text-white" : "bg-feel/15 text-feel"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" /> {equipped ? "Equipped" : "Equip"}
                      </button>
                    ) : (
                      <button
                        disabled={!afford || busy === item.item_id}
                        onClick={() => buy(item)}
                        className={cx(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition active:scale-95",
                          afford ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-white/30"
                        )}
                      >
                        {!afford ? <Lock className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
                        {item.price} V¢
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="px-5 pb-4 pt-1 text-center text-[11px] text-white/35">
              Earn V¢ by posting and showing up. Equip cosmetics to style your
              public profile.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
