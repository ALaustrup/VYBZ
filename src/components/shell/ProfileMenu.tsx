import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Headphones,
  Heart,
  Library,
  LogOut,
  MessageCircle,
  Pencil,
  Radio,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { formatVc, formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  match?: (path: string, tab: string | null) => boolean;
  staff?: "mod" | "admin";
  memberOnly?: boolean;
  danger?: boolean;
};

const PRIMARY: NavItem[] = [
  {
    id: "hub",
    label: "Hub",
    to: "/",
    icon: Sparkles,
    match: (p, tab) => p === "/" && (!tab || tab === "hub"),
  },
  {
    id: "listen",
    label: "Listen",
    to: "/?tab=listen",
    icon: Headphones,
    match: (p, tab) => p === "/" && tab === "listen",
  },
  {
    id: "live",
    label: "Live",
    to: "/?tab=live",
    icon: Radio,
    match: (p, tab) => (p === "/" && tab === "live") || p.startsWith("/live"),
  },
  {
    id: "connect",
    label: "Connect",
    to: "/?tab=connect",
    icon: Heart,
    match: (p, tab) => p === "/" && tab === "connect",
  },
  {
    id: "you",
    label: "You",
    to: "/?tab=you",
    icon: Users,
    match: (p, tab) => p === "/" && tab === "you",
  },
  {
    id: "wallet",
    label: "Wallet",
    to: "/?tab=wallet",
    icon: Wallet,
    match: (p, tab) => p === "/" && tab === "wallet",
  },
];

const SECONDARY: NavItem[] = [
  {
    id: "messages",
    label: "Messages",
    to: "/messages",
    icon: MessageCircle,
    match: (p) => p.startsWith("/messages"),
  },
  {
    id: "library",
    label: "Library",
    to: "/library",
    icon: Library,
    match: (p) => p.startsWith("/library"),
  },
  {
    id: "packages",
    label: "Packages",
    to: "/store",
    icon: Sparkles,
    match: (p) => p.startsWith("/store"),
  },
  {
    id: "codex",
    label: "Codex",
    to: "/codex",
    icon: ScrollText,
    match: (p) => p.startsWith("/codex") || p.startsWith("/legal"),
  },
  {
    id: "edit",
    label: "Edit profile",
    to: "/profile/edit",
    icon: Pencil,
    match: (p) => p.startsWith("/profile/edit"),
  },
];

const STAFF: NavItem[] = [
  { id: "mod", label: "Moderate", to: "/mod", icon: Shield, staff: "mod", match: (p) => p.startsWith("/mod") && !p.startsWith("/apply") },
  { id: "admin", label: "Admin", to: "/admin", icon: ShieldCheck, staff: "admin", match: (p) => p.startsWith("/admin") },
  { id: "apply-mod", label: "Become a moderator", to: "/apply-mod", icon: Shield, memberOnly: true, match: (p) => p.startsWith("/apply-mod") },
];

function canSee(item: NavItem, role: string, isAdmin: boolean): boolean {
  if (item.staff === "admin") return isAdmin || role === "admin";
  if (item.staff === "mod") return isAdmin || role === "admin" || role === "moderator";
  if (item.memberOnly) return !isAdmin && role === "member";
  return true;
}

/**
 * Profile avatar → cascading site menu (premium dropdown).
 */
export function ProfileMenu() {
  const { profile, signOut, unread } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const tab = params.get("tab");
  const reduce = useReduceFx();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const role = profile?.platformRole ?? "member";
  const isAdmin = !!profile?.isAdmin || role === "admin";
  const addr = formatVcAddress(profile?.username);
  const vc = Number(profile?.modPoints ?? 0);

  useEffect(() => {
    setOpen(false);
  }, [pathname, tab]);

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

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  async function logout() {
    setOpen(false);
    await signOut();
  }

  const sections: { id: string; label?: string; items: NavItem[] }[] = [
    { id: "primary", items: PRIMARY },
    { id: "more", label: "More", items: SECONDARY },
    {
      id: "staff",
      label: "Staff",
      items: STAFF.filter((i) => canSee(i, role, isAdmin)),
    },
  ].filter((s) => s.items.length > 0);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(
          "relative flex h-10 w-10 items-center justify-center rounded-full transition duration-suite-base ease-suite",
          "ring-1 ring-white/20 hover:ring-suite-cyan/50 hover:shadow-glow",
          open && "ring-suite-cyan/60 shadow-glow-feel",
        )}
      >
        <Avatar
          url={profile?.avatarUrl}
          name={profile?.username}
          id={profile?.id}
          size="sm"
          square={false}
        />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-suite-cyan px-1 text-[9px] font-bold text-ink-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Site menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="glass-vibrant absolute right-0 top-[calc(100%+0.55rem)] z-[80] max-h-[min(70dvh,28rem)] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl shadow-suite-lg"
          >
            <div className="border-b border-white/10 px-3.5 py-3">
              <p className="truncate font-mono text-[13px] font-semibold text-suite-cyan/90">{addr || "VYBZ"}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{formatVc(vc)} Vc</p>
            </div>

            <div className="no-scrollbar max-h-[min(70dvh,28rem)] overflow-y-auto py-1.5">
              {sections.map((section, si) => (
                <div key={section.id} className={cx(si > 0 && "mt-1 border-t border-white/8 pt-1.5")}>
                  {section.label && (
                    <p className="px-3.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      {section.label}
                    </p>
                  )}
                  <ul className="px-1.5">
                    {section.items.map((item, ii) => {
                      const active = item.match?.(pathname, tab) ?? pathname === item.to;
                      const Icon = item.icon;
                      return (
                        <motion.li
                          key={item.id}
                          initial={reduce ? false : { opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: reduce ? 0 : 0.02 * ii + 0.03 * si }}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => go(item.to)}
                            className={cx(
                              "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium transition duration-suite-fast ease-suite",
                              active
                                ? "bg-suite-cyan/15 text-white shadow-glow"
                                : "text-white/70 hover:bg-white/[0.06] hover:text-white hover:shadow-glow-feel",
                            )}
                          >
                            <span
                              className={cx(
                                "flex h-8 w-8 items-center justify-center rounded-lg transition duration-suite-fast ease-suite",
                                active
                                  ? "bg-suite-cyan/20 text-suite-cyan/90"
                                  : "bg-white/[0.05] text-white/55 group-hover:text-suite-success group-hover:shadow-glow-feel",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {active && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-suite-cyan shadow-glow" />
                            )}
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <div className="mt-1 border-t border-white/8 px-1.5 pt-1.5 pb-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/55 transition duration-suite-fast ease-suite hover:bg-wild/15 hover:text-wild hover:shadow-glow-wild"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] group-hover:bg-wild/20">
                    <LogOut className="h-4 w-4" />
                  </span>
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
