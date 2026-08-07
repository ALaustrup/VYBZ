import { NavLink } from "react-router-dom";
import { PRODUCT_ACCENT_RGB } from "@/design/tokens";
import { HOME_ITEM, navItems } from "@/shell/navModel";
import { cx } from "@/lib/utils";

/** Narrow-width nav — same destinations as PrimaryRail / navModel. */
export function MobileNav() {
  const items = [HOME_ITEM, ...navItems().filter((i) => i.path !== HOME_ITEM.path)].slice(0, 8);

  return (
    <nav
      className="suite-mobile-nav border-b border-white/[0.06] lg:hidden"
      aria-label="Suite mobile navigation"
    >
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const accent = PRODUCT_ACCENT_RGB[item.productId];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cx(
                  "relative shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  isActive
                    ? "border-white/20 bg-white/[0.1] text-white"
                    : "border-white/8 bg-white/[0.03] text-white/50",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
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
