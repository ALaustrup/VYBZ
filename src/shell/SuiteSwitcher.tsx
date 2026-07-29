import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronsUpDown } from "lucide-react";
import { suiteNavRoutes, matchSuiteProduct } from "@/app/routeManifest";
import { PRODUCT_LABEL } from "@/design/tokens";
import { cx } from "@/lib/utils";

export function SuiteSwitcher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const product = matchSuiteProduct(pathname);
  const label = product ? PRODUCT_LABEL[product] : "Suite";
  const routes = suiteNavRoutes();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative px-1">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex w-full items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left text-[12px] font-medium text-white/80 transition hover:bg-white/[0.07]",
          open && "ring-1 ring-white/20",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Switch Suite product"
          className="absolute left-0 right-0 z-[80] mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[rgba(12,22,40,0.96)] p-1 shadow-xl backdrop-blur-xl"
        >
          {routes.map((route) => (
            <li key={route.path}>
              <button
                type="button"
                role="option"
                aria-selected={pathname === route.path}
                className="flex w-full rounded-lg px-2.5 py-2 text-left text-[12px] text-white/75 hover:bg-white/10"
                onClick={() => {
                  setOpen(false);
                  navigate(route.path);
                }}
              >
                {route.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
