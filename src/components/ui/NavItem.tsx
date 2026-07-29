import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "@/lib/utils";

export type NavItemProps = Omit<
  ComponentPropsWithoutRef<typeof NavLink>,
  "children" | "className"
> & {
  icon?: ReactNode;
  label: ReactNode;
  className?: string;
  /** Compact rail mode (icon + short label). */
  rail?: boolean;
};

const base =
  "group flex items-center gap-2 rounded-suite-md text-sm font-medium text-fog " +
  "transition duration-suite-base ease-suite motion-reduce:transition-none " +
  "hover:bg-white/[0.06] hover:text-snow " +
  "focus-visible:outline-none focus-visible:shadow-suite-focus " +
  "aria-[current=page]:bg-white/[0.08] aria-[current=page]:text-snow";

export const NavItem = forwardRef<HTMLAnchorElement, NavItemProps>(function NavItem(
  { icon, label, rail = false, className, ...rest },
  ref
) {
  return (
    <NavLink
      ref={ref}
      className={({ isActive }) =>
        cx(
          base,
          rail ? "flex-col gap-1 px-2 py-2.5 text-[11px]" : "px-3 py-2",
          isActive && "bg-white/[0.08] text-snow",
          className
        )
      }
      {...rest}
    >
      {icon ? <span className="shrink-0 opacity-80 group-hover:opacity-100">{icon}</span> : null}
      <span className={cx(rail && "text-center leading-tight")}>{label}</span>
    </NavLink>
  );
});
