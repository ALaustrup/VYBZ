/** Sample Pack Storefront — isolated types (no zip paths on public DTOs). */

export type StorefrontPackStatus = "draft" | "published";

export interface StorefrontPack {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  features: string[];
  genre: string;
  price_cents: number;
  currency: string;
  preview_path: string | null;
  zip_path: string | null;
  cover_path: string | null;
  status: StorefrontPackStatus;
  created_at: string;
  updated_at: string;
}

/** Safe public pack (no zip_path). */
export interface StorefrontPackPublic {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  features: string[];
  genre: string;
  price_cents: number;
  currency: string;
  preview_path: string | null;
  cover_path: string | null;
  created_at: string;
  updated_at: string;
}

export type SettlementStatus = "pending_manual" | "settled_off_platform";

export interface StorefrontOrder {
  id: string;
  pack_id: string;
  buyer_email: string;
  buyer_user_id: string | null;
  amount_cents: number;
  application_fee_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  status: "pending" | "paid" | "failed";
  settlement_status: SettlementStatus;
  fulfilled_at: string | null;
  created_at: string;
}

export interface PackCopyResult {
  title: string;
  description: string;
  features: string[];
}

export const STOREFRONT_PREVIEWS_BUCKET = "storefront-previews";
export const STOREFRONT_ZIPS_BUCKET = "storefront-zips";

export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 500_000;
export const PLATFORM_FEE_BPS = 1000; // 10%

export function formatPackPrice(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function previewPublicUrl(path: string | null | undefined, supabaseUrl: string): string | null {
  if (!path) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${STOREFRONT_PREVIEWS_BUCKET}/${path}`;
}

export function defaultCoverUrl(): string {
  return "/brand/icon.svg";
}
