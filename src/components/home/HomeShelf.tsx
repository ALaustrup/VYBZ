import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Spotify-style home shelf: large title, optional Show all, then a row or list.
 */
export function HomeShelf({
  eyebrow,
  title,
  to,
  toLabel = "Show all",
  children,
  testId,
}: {
  eyebrow?: string;
  title: string;
  to?: string;
  toLabel?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="relative z-[1]" data-testid={testId}>
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
        </div>
        {to ? (
          <Link
            to={to}
            className="shrink-0 text-[12px] font-semibold text-white/45 transition hover:text-white/85"
          >
            {toLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Horizontal snap row used by live, episode, and library shelves. */
export function HomeShelfRow({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {children}
    </div>
  );
}
