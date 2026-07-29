import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { PackCheckoutButton } from "@/features/storefront/PackCheckoutButton";
import {
  formatPackPrice,
  previewPublicUrl,
  defaultCoverUrl,
  type StorefrontPackPublic,
} from "@/features/storefront/types";
import { BrandLockup } from "@/components/Brand";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

export function StorefrontPackPage({ publicShell = false }: { publicShell?: boolean }) {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const { showToast } = useSession();
  const [pack, setPack] = useState<StorefrontPackPublic | null | undefined>(undefined);
  const checkoutState = params.get("checkout");

  useRegisterAppBar({ title: pack?.title ?? "Sample pack" }, [pack?.title]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await api.getPublishedStorefrontPack(slug);
        if (!cancelled) setPack(p);
      } catch {
        if (!cancelled) setPack(null);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!pack) return;
    document.title = `${pack.title} · VYBZ Packs`;
    const cover = previewPublicUrl(pack.cover_path, SUPABASE_URL) ?? defaultCoverUrl();
    upsertMeta("og:title", pack.title);
    upsertMeta("og:description", pack.description.slice(0, 160));
    upsertMeta("og:image", cover.startsWith("http") ? cover : `${window.location.origin}${cover}`);
    return () => {
      document.title = "VYBZ";
    };
  }, [pack]);

  const previewUrl = useMemo(
    () => (pack ? previewPublicUrl(pack.preview_path, SUPABASE_URL) : null),
    [pack],
  );
  const coverUrl = useMemo(
    () => (pack ? previewPublicUrl(pack.cover_path, SUPABASE_URL) ?? defaultCoverUrl() : defaultCoverUrl()),
    [pack],
  );

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  if (pack === undefined) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-white/60">This pack is unavailable.</p>
        {publicShell && (
          <Link to="/enter" className="btn btn-primary mt-4 inline-flex px-4 py-2 text-sm">Enter VYBZ</Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 pb-28">
      {publicShell && (
        <div className="mb-2 flex items-center justify-between">
          <Link to="/"><BrandLockup height="h-7" /></Link>
          <Link to="/enter" className="btn btn-ghost px-3 py-1.5 text-xs">Enter VYBZ</Link>
        </div>
      )}

      {checkoutState === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Payment received</div>
            <p className="mt-0.5 text-emerald-100/75">Check your email for a secure download link (valid 24 hours).</p>
          </div>
        </div>
      )}
      {checkoutState === "cancel" && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
          Checkout canceled — no charge was made.
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
        <img src={coverUrl} alt="" className="aspect-square w-full object-cover" />
        <div className="space-y-4 p-5">
          {pack.genre && (
            <div className="text-xs uppercase tracking-wider text-veil-300/90">{pack.genre}</div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-white">{pack.title}</h1>
          <p className="text-sm leading-relaxed text-white/65">{pack.description}</p>
          {pack.features?.length > 0 && (
            <ul className="space-y-1.5 text-sm text-white/75">
              {pack.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-veil-300">▸</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {previewUrl && (
            <audio controls preload="metadata" src={previewUrl} className="w-full" />
          )}
          <div className="pt-1 text-sm text-white/40">
            {formatPackPrice(pack.price_cents, pack.currency)} · Instant download after purchase
          </div>
          <PackCheckoutButton
            packId={pack.id}
            priceCents={pack.price_cents}
            currency={pack.currency}
            disabled={checkoutState === "success"}
            onError={(m) => showToast(m)}
          />
        </div>
      </div>
    </div>
  );
}

function upsertMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
