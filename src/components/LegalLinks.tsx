import { Link } from "react-router-dom";
import { LEGAL_DOCS, LEGAL_ORDER } from "@/data/legal";
import { cx } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
  /** Slug to omit (e.g. the page you're already on). */
  exclude?: string;
}

/** A compact, dot-separated row of links to every public policy. */
export function LegalLinks({ className, exclude }: LegalLinksProps) {
  const slugs = LEGAL_ORDER.filter((s) => s !== exclude);
  return (
    <nav
      className={cx(
        "flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px] text-white/40",
        className
      )}
    >
      {slugs.map((slug, i) => (
        <span key={slug} className="flex items-center gap-1">
          <Link
            to={`/legal/${slug}`}
            className="transition hover:text-white/70 active:text-white/70"
          >
            {LEGAL_DOCS[slug].short}
          </Link>
          {i < slugs.length - 1 && <span aria-hidden>·</span>}
        </span>
      ))}
    </nav>
  );
}
