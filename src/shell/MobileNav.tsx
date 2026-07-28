import { NavLink } from "react-router-dom";
import { suiteNavRoutes } from "@/app/routeManifest";
import { PRODUCT_ACCENT_RGB } from "@/design/tokens";
import { cx } from "@/lib/utils";

export function MobileNav() {
  const routes = suiteNavRoutes();

  return (
    <nav
      className="suite-mobile-nav lg:hidden"
      aria-label="Suite mobile navigation"
    >
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {routes.map((route) => {
          const accent = PRODUCT_ACCENT_RGB[route.productId];
          return (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.path === "/"}
              className={({ isActive }) =>
                cx(
                  "relative shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  isActive
                    ? "border-white/25 bg-white/12 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/55",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {route.title}
                  {isActive ? (
                    <span
                      className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full"
                      style={{ background: `rgb(${accent})` }}
                      aria-hidden
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
