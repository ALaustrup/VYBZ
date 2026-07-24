import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Store } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import type { ProjectDetail, RepoListing } from "@/types";

const GRANT_LABEL: Record<string, string> = {
  download: "Download pack",
  fork: "Fork into my Repos",
  collab_invite: "Collab seat",
};

/** Owner listing controls + buyer purchase with cosmetic credits (`mod_points`). */
export function RepoListingPanel({
  detail,
  projectId,
  onRefresh,
}: {
  detail: ProjectDetail;
  projectId: string;
  onRefresh: () => void;
}) {
  const { showToast, profile, refreshProfile } = useSession();
  const [listing, setListing] = useState<RepoListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(50);
  const [grant, setGrant] = useState<"download" | "fork" | "collab_invite">("download");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const l = await api.getRepoListing(projectId);
      if (cancelled) return;
      setListing(l);
      if (l) {
        setPrice(l.priceCredits);
        setGrant(l.grantKind);
        setActive(l.active);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  async function saveListing() {
    setBusy(true);
    try {
      const ok = await api.upsertRepoListing(projectId, price, grant, active);
      if (ok) {
        showToast(active ? "Listing updated." : "Listing deactivated.");
        setListing(await api.getRepoListing(projectId));
        onRefresh();
      } else showToast("Couldn't update listing (set visibility to listed).");
    } catch {
      showToast("Couldn't update listing.");
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    setBusy(true);
    try {
      const id = await api.purchaseRepo(projectId);
      if (id) {
        showToast(`Purchased — ${GRANT_LABEL[listing?.grantKind ?? "download"] ?? "access"} granted.`);
        await refreshProfile();
        setListing(await api.getRepoListing(projectId));
      } else showToast("Purchase failed.");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      showToast(msg.includes("credits") || msg.includes("mod") ? "Not enough cosmetic credits." : "Purchase failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-veil-300" />
      </div>
    );
  }

  const credits = profile?.modPoints ?? 0;
  const isOwner = detail.isOwner;
  const canBuy = !isOwner && listing?.active && listing.priceCredits > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1 flex items-center gap-1.5">
          <Store className="h-3 w-3" /> Listing
        </p>
        <p className="text-[12px] text-white/40">
          Sell access with cosmetic credits (`mod_points`). Verified creator credits still come from split + release.
        </p>
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <label className="block text-[11px] text-white/45">
            Price (credits)
            <input
              type="number"
              min={1}
              max={100000}
              value={price}
              onChange={(e) => setPrice(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-veil-400/60 focus:outline-none"
            />
          </label>
          <label className="block text-[11px] text-white/45">
            Grant
            <select
              value={grant}
              onChange={(e) => setGrant(e.target.value as typeof grant)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            >
              <option value="download" className="bg-ink-900">Download pack</option>
              <option value="fork" className="bg-ink-900">Fork into buyer Repo</option>
              <option value="collab_invite" className="bg-ink-900">Collab seat</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
            Active (requires repo visibility = listed)
          </label>
          {listing && (
            <p className="text-[11px] text-white/35">{listing.sales} sales · visibility {detail.visibility}</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveListing()}
            className="btn btn-primary w-full py-2.5 text-sm disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save listing"}
          </button>
        </div>
      ) : listing?.active ? (
        <div className="space-y-3">
          <p className="font-display text-lg text-white">
            {listing.priceCredits}{" "}
            <span className="text-sm font-sans font-normal text-white/50">credits</span>
          </p>
          <p className="text-sm text-white/55">
            {GRANT_LABEL[listing.grantKind] ?? listing.grantKind}
            {listing.daw ? ` · ${listing.daw}` : ""}
          </p>
          <p className="text-[11px] text-white/35">Your balance: {credits} credits</p>
          {canBuy && (
            <button
              type="button"
              disabled={busy || credits < listing.priceCredits}
              onClick={() => void buy()}
              className="btn btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              Buy with credits
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/40">Not listed for sale.</p>
      )}
    </div>
  );
}
