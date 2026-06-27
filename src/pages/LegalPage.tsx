import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  COMPANY,
  CONTACT_EMAIL,
  LAST_UPDATED,
  LEGAL_DOCS,
  LEGAL_ORDER,
} from "@/data/legal";
import { LegalLinks } from "@/components/LegalLinks";

/**
 * Standalone, publicly accessible policy reader. Rendered outside the gated app
 * shell so Terms, Privacy, Refund, and Community Guidelines are always reachable
 * — including before sign-in and from external links.
 */
export function LegalPage() {
  const { doc } = useParams<{ doc: string }>();
  const navigate = useNavigate();
  const slug = doc && LEGAL_DOCS[doc] ? doc : "terms";
  const document = LEGAL_DOCS[slug];

  const scrollRef = useRef<HTMLDivElement>(null);
  // Always start at the top when switching documents.
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [slug]);

  function back() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }

  return (
    <div ref={scrollRef} className="h-[100dvh] overflow-y-auto bg-ink-950 bg-veil-radial">
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        {/* Header. */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-ink-950/85 px-5 py-4 backdrop-blur-xl">
          <button
            onClick={back}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-none text-gradient">
              MYVYB
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">Legal</p>
          </div>
        </header>

        <main className="flex-1 px-6 pb-12 pt-6">
          <h1 className="font-display text-3xl font-bold text-white">
            {document.title}
          </h1>
          <p className="mt-1 text-xs text-white/40">
            Last updated {LAST_UPDATED}
          </p>

          <p className="mt-5 text-sm leading-relaxed text-white/70">
            {document.intro}
          </p>

          <div className="mt-8 space-y-7">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-lg font-semibold text-white">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((p, i) => (
                  <p
                    key={i}
                    className="mt-2 text-sm leading-relaxed text-white/65"
                  >
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-2 space-y-1.5">
                    {section.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm leading-relaxed text-white/65"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-veil-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Other policies. */}
          <div className="mt-10 border-t border-white/8 pt-6">
            <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-white/35">
              More policies
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LEGAL_ORDER.filter((s) => s !== slug).map((s) => (
                <Link
                  key={s}
                  to={`/legal/${s}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm font-semibold text-white/80 transition active:scale-[0.98]"
                >
                  {LEGAL_DOCS[s].title}
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-white/40">
            Questions?{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-veil-300 underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-3 text-center text-[11px] text-white/30">
            © {new Date().getFullYear()} {COMPANY} · MYVYB
          </p>
          <LegalLinks className="mt-4" exclude={slug} />
        </main>
      </div>
    </div>
  );
}
