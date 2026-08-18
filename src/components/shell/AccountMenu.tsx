import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Account menu — who you are, and how to leave.
 *
 * `ProfileMenu` and `OrbMenu` both carry a sign-out, but neither is mounted, so
 * the signed-in app had no way out at all. This is the small, always-present
 * version: identity, settings, sign out.
 */
export function AccountMenu() {
  const { profile, email, signOut } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReduceFx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  const name = profile?.username?.trim() || null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="account-menu-button"
        className={cx("forge-chip flex h-10 w-10 active:scale-90", open && "forge-chip--active")}
      >
        <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="forge-glass absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-56 overflow-hidden p-1.5 shadow-suite-lg"
            data-testid="account-menu"
          >
            <div className="px-2.5 pb-1.5 pt-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {name ? `@${name}` : "Signed in"}
              </p>
              {email ? (
                <p className="truncate text-[11px] text-white/40">{email}</p>
              ) : null}
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/profile/edit");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition hover:bg-white/10"
            >
              <span className="forge-chip flex h-8 w-8 text-[rgb(var(--accent-rgb))]">
                <Settings className="h-4 w-4" />
              </span>
              Settings
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition hover:bg-white/10"
            >
              <span className="forge-chip flex h-8 w-8 text-white/70">
                <UserRound className="h-4 w-4" />
              </span>
              Your page
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              data-testid="account-sign-out"
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition hover:bg-wild/15 hover:text-white"
            >
              <span className="forge-chip flex h-8 w-8 text-wild">
                <LogOut className="h-4 w-4" />
              </span>
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
