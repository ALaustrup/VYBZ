import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, Users } from "lucide-react";
import * as api from "@/lib/api";
import { useReduceFx } from "@/lib/display";
import { PROFESSION_LABEL } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { CreatorSearchResult } from "@/types";

/**
 * Discover other people from a menu — not on the owner's VYBZ.
 * `/connect` and `/u/:id` stay the destinations.
 */
export function PeopleMenu() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReduceFx();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      void api.searchCreators(query.trim() || undefined).then((list) => {
        if (!cancelled) {
          setResults(list);
          setLoading(false);
        }
      });
    }, query.trim() ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query]);

  function openPerson(userId: string) {
    setOpen(false);
    navigate(`/u/${userId}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Find creators"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="people-menu-button"
        data-tip="People"
        className={cx("forge-chip flex h-10 w-10 active:scale-90", open && "forge-chip--active")}
      >
        <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Find creators"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="forge-glass absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-[min(20.5rem,calc(100vw-2rem))] overflow-hidden p-1.5 shadow-suite-lg"
            data-testid="people-menu"
          >
            <label className="forge-field mx-1 mt-1 mb-1.5">
              <Search className="forge-field-icon h-4 w-4" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people…"
                aria-label="Search creators"
              />
            </label>

            <div className="no-scrollbar max-h-[min(22rem,50dvh)] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/35" />
                </div>
              ) : results.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-[12px] text-white/40">
                  {query.trim() ? "No one matches that." : "No people to show yet."}
                </p>
              ) : (
                <ul>
                  {results.map((p) => {
                    const name = p.username?.trim() || "Creator";
                    const role = p.profession ? PROFESSION_LABEL[p.profession] ?? p.profession : null;
                    return (
                      <li key={p.userId}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openPerson(p.userId)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/10"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] font-display text-[12px] font-semibold text-white/80">
                            {name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-white">
                              {p.username ? `@${p.username}` : name}
                            </span>
                            <span className="block truncate text-[11px] text-white/40">
                              {[role, p.location].filter(Boolean).join(" · ") || "On VYBZ"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
