import { Link } from "react-router-dom";
import { Coins, Crown, Glasses, Radio, Sparkles } from "lucide-react";
import { useApp } from "@/store/AppStore";

/**
 * Desktop right-hand context rail — fills the wide layout with a tasteful
 * identity/wallet card and quick links, so large displays feel full and
 * intentional rather than a stretched phone. Shown only on xl+ screens.
 */
export function ContextRail() {
  const { account, credits, hasWallet, isPremium, openPremium, godmodePrice } =
    useApp();

  return (
    <aside className="z-30 hidden h-full w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 px-4 py-5 xl:flex">
      {/* Wallet / identity. */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-white/45">
            {account?.anonymous ? "Anonymous" : "Your wallet"}
          </span>
          {isPremium && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              <Crown className="h-3 w-3" /> Godmode
            </span>
          )}
        </div>
        <div className="mt-2 flex items-end gap-1.5">
          <Coins className="mb-1 h-5 w-5 text-amber-300" />
          <span className="font-display text-3xl font-bold text-white">
            {hasWallet ? credits : "—"}
          </span>
          <span className="mb-1 text-sm text-white/45">V¢</span>
        </div>
        <p className="mt-1 text-[11px] text-white/45">
          {hasWallet
            ? "Earn V¢ by posting and playing. Spend on customization."
            : "Create an identity to earn and spend V¢."}
        </p>
      </div>

      {/* Quick links. */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/live"
          className="glass-panel flex flex-col items-center gap-2 p-4 text-veil-100 transition hover:bg-black/25"
        >
          <Radio className="h-6 w-6" />
          <span className="text-xs font-semibold">Live</span>
        </Link>
        <Link
          to="/xr"
          className="glass-panel flex flex-col items-center gap-2 p-4 text-white/75 transition hover:bg-black/25"
        >
          <Glasses className="h-6 w-6" />
          <span className="text-xs font-semibold">MYVYB VR</span>
        </Link>
      </div>

      {/* Godmode promo (non-members). */}
      {!isPremium && (
        <button
          onClick={openPremium}
          className="glass-panel flex items-center gap-3 p-4 text-left transition hover:bg-black/25"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-white">
              Unlock Godmode — {godmodePrice}
            </p>
            <p className="text-[11px] text-white/50">
              Discounts, exclusives, 5× votes, and more.
            </p>
          </div>
        </button>
      )}

      <div className="glass-panel flex items-start gap-2 p-4 text-[11px] leading-relaxed text-white/45">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-veil-300" />
        Tip: customize your dock and background in your profile — earned with V¢.
      </div>
    </aside>
  );
}
