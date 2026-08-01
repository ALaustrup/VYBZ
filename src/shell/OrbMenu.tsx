import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { PRODUCT_ACCENT_RGB } from "@/design/tokens";
import { HOME_ITEM, accountItems, navGroups, type NavItem } from "@/shell/navModel";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

/** Hover-to-open only where a real pointer exists; touch needs an explicit tap. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

/**
 * The single navigation surface. Collapsed to one orb by default; opens on hover with a
 * fine pointer, on tap otherwise, and closes on Escape, outside click, or navigation.
 */
export function OrbMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const finePointer = useFinePointer();
  const reduce = useReducedMotion();
  const location = useLocation();
  const { profile, signOut } = useSession();
  const groups = navGroups();
  const account = accountItems(profile?.platformRole ?? "member", !!profile?.isAdmin);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Small grace period so crossing the gap between orb and panel does not close it.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const spring = reduce
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

  return (
    <div
      ref={rootRef}
      className="orb-menu-root"
      onMouseEnter={finePointer ? () => { cancelClose(); setOpen(true); } : undefined}
      onMouseLeave={finePointer ? scheduleClose : undefined}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            className="orb-panel lg-surface"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.94 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
            transition={spring}
          >
            <div className="orb-panel-sheen" aria-hidden />
            <nav aria-label="Main navigation" className="orb-panel-inner">
              <OrbLink item={HOME_ITEM} wide />
              {groups.map((group) => (
                <div key={group.id} className="orb-group">
                  <p className="orb-group-label">{group.label}</p>
                  <div className="orb-group-items">
                    {group.items.map((item) => (
                      <OrbLink key={item.path} item={item} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="orb-group">
                <p className="orb-group-label">Profile</p>
                <div className="orb-group-items">
                  {account.map((item) => (
                    <OrbLink key={item.path} item={item} />
                  ))}
                </div>
              </div>
              <button type="button" className="orb-signout" onClick={() => void signOut()}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={buttonRef}
        type="button"
        className={cx("orb-trigger", open && "is-open")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="orb-halo" aria-hidden />
        <span className="orb-body" aria-hidden>
          <span className="orb-sheen" />
          <span className="orb-specular" />
        </span>
        <span className="orb-glyph" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>
  );
}

function OrbLink({ item, wide = false }: { item: NavItem; wide?: boolean }) {
  const Icon = item.icon;
  const accent = PRODUCT_ACCENT_RGB[item.productId];
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      style={{ ["--item-accent" as string]: accent }}
      className={({ isActive }) => cx("orb-item", wide && "orb-item--wide", isActive && "is-active")}
    >
      <span className="orb-item-icon" aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="orb-item-label">{item.label}</span>
        <span className="orb-item-hint">{item.hint}</span>
      </span>
    </NavLink>
  );
}
