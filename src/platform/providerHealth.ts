import type { ProviderMode } from "@/platform/costs/types";

export type ProviderHealthStatus = {
  id: string;
  label: string;
  role: string;
  mode: ProviderMode;
  healthy: boolean;
  notes?: string;
};

/** Static registry matching docs/operations/VENDOR_REGISTER.md */
const REGISTRY: readonly ProviderHealthStatus[] = [
  {
    id: "supabase",
    label: "Supabase",
    role: "Auth, DB, Storage, Edge, Realtime",
    mode: "production",
    healthy: true,
    notes: "xixmneooyufbeftdfpcm",
  },
  {
    id: "stripe",
    label: "Stripe",
    role: "Checkout, Connect, webhooks",
    mode: "production",
    healthy: true,
  },
  {
    id: "resend",
    label: "Resend",
    role: "Transactional email",
    mode: "hard_cap",
    healthy: true,
  },
  {
    id: "livekit",
    label: "LiveKit",
    role: "Live SFU / voice",
    mode: "hard_cap",
    healthy: true,
  },
  {
    id: "groq",
    label: "Groq",
    role: "Storefront copy",
    mode: "free_only",
    healthy: true,
  },
  {
    id: "fal",
    label: "fal",
    role: "Visual stills",
    mode: "prepaid_only",
    healthy: true,
    notes: "Never decorative unmetered gen",
  },
  {
    id: "vercel",
    label: "Vercel",
    role: "SPA host",
    mode: "production",
    healthy: true,
  },
  {
    id: "cloudflare-pages",
    label: "Cloudflare Pages",
    role: "Planned SPA host",
    mode: "disabled",
    healthy: false,
    notes: "Until canary",
  },
  {
    id: "ovh",
    label: "OVH",
    role: "Engine jobs / backups",
    mode: "manual_approval",
    healthy: true,
  },
  {
    id: "bunny",
    label: "Bunny",
    role: "Legacy media",
    mode: "disabled",
    healthy: false,
    notes: "Dormant — do not re-enable",
  },
  {
    id: "expressturn",
    label: "ExpressTURN",
    role: "Optional WebRTC TURN",
    mode: "manual_approval",
    healthy: true,
  },
] as const;

export function getProviderHealth(): readonly ProviderHealthStatus[] {
  return REGISTRY;
}

export function getProviderHealthById(
  id: string,
): ProviderHealthStatus | undefined {
  return REGISTRY.find((p) => p.id === id);
}
