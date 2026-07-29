import { useState } from "react";
import { useLocation } from "react-router-dom";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { matchSuiteProduct } from "@/app/routeManifest";
import { PRODUCT_ACCENT_RGB, PRODUCT_LABEL } from "@/design/tokens";
import { cx } from "@/lib/utils";

export function ContextInspector({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const product = matchSuiteProduct(pathname);
  const label = product ? PRODUCT_LABEL[product] : "Suite";
  const accent = product ? PRODUCT_ACCENT_RGB[product] : "0 194 255";

  return (
    <aside
      className={cx(
        "suite-inspector hidden shrink-0 border-l border-white/10 bg-white/[0.02] transition-[width] lg:flex lg:flex-col",
        open ? "w-52" : "w-10",
      )}
      aria-label="Context inspector"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Collapse inspector" : "Expand inspector"}
        className="flex h-10 items-center justify-center text-white/45 hover:text-white/80"
      >
        {open ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </button>
      {open ? (
        <div className="flex flex-col gap-2 px-3 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Context
          </p>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `rgb(${accent})` }}
              aria-hidden
            />
            <p className="text-sm font-medium text-white/85">{label}</p>
          </div>
          <p className="break-all text-[11px] text-white/40">{pathname}</p>
        </div>
      ) : null}
    </aside>
  );
}
