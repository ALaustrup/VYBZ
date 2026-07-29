import { NavLink } from "react-router-dom";
import { suiteNavRoutes } from "@/app/routeManifest";
import { PRODUCT_ACCENT_RGB, PRODUCT_LABEL } from "@/design/tokens";
import { SuiteSwitcher } from "@/shell/SuiteSwitcher";
import { cx } from "@/lib/utils";

export function PrimaryRail() {
  const routes = suiteNavRoutes();

  return (
    <aside className="suite-rail" aria-label="Suite navigation">
      <div className="flex flex-col gap-1 px-2 pb-3 pt-4">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Suite
        </p>
        <SuiteSwitcher />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {routes.map((route) => {
          const accent = PRODUCT_ACCENT_RGB[route.productId];
          return (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.path === "/"}
              className={({ isActive }) =>
                cx(
                  "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white/85",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                    )}
                    style={{ background: `rgb(${accent})` }}
                    aria-hidden
                  />
                  <span className="truncate">{route.title}</span>
                  <span className="ml-auto truncate text-[10px] text-white/30">
                    {PRODUCT_LABEL[route.productId]}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
