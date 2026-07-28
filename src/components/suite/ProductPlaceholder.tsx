import { Layers } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PRODUCT_ACCENT_RGB, PRODUCT_LABEL, type SuiteProductId } from "@/design/tokens";

export function ProductPlaceholder({
  productId,
  title,
  blurb,
  phaseNote = "Phase N — product UI ships after Suite shell gates.",
}: {
  productId: SuiteProductId;
  title: string;
  blurb: string;
  phaseNote?: string;
}) {
  const accent = PRODUCT_ACCENT_RGB[productId];
  const label = PRODUCT_LABEL[productId];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-10">
      <div
        className="h-1 w-16 rounded-full"
        style={{ background: `rgb(${accent})` }}
        aria-hidden
      />
      <EmptyState
        icon={Layers}
        title={title}
        body={blurb}
      />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
          Suite placeholder · {label}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">{phaseNote}</p>
        <p className="mt-2 text-xs text-white/35">
          This route is reserved for the VYBZ Suite. Existing surfaces stay wired until cutover.
        </p>
      </div>
    </div>
  );
}
