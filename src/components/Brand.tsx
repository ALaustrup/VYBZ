import { useState } from "react";
import { cx } from "@/lib/utils";

/**
 * The VYBZ icon. Uses the official artwork at `/brand/icon.svg` (preferred) or
 * `/brand/icon.png` once dropped into `public/brand/`; until then it renders a
 * hand-built fallback mark so nothing looks broken. The official icon is
 * full-color, so it renders as an image (size classes still apply).
 */
export function BrandMark({
  className,
  title = "VYBZ",
}: {
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/brand/icon.svg"
        onError={(e) => {
          const el = e.currentTarget;
          if (!el.dataset.triedPng) {
            el.dataset.triedPng = "1";
            el.src = "/brand/icon.png";
          } else {
            setFailed(true);
          }
        }}
        alt={title}
        className={cx("select-none object-contain", className)}
        draggable={false}
      />
    );
  }

  // Fallback: hand-built linked-nodes mark (currentColor-themeable).
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <g strokeWidth={6} strokeLinecap="round">
        <line x1="28.9" y1="22.6" x2="37.1" y2="21.4" />
        <line x1="24.6" y1="31.8" x2="28.4" y2="38.3" />
        <line x1="42.0" y1="28.1" x2="37.0" y2="38.0" />
      </g>
      <g strokeWidth={5}>
        <circle cx="20" cy="24" r="6.5" />
        <circle cx="46" cy="20" r="6.5" />
        <circle cx="33" cy="46" r="6.5" />
      </g>
    </svg>
  );
}

/**
 * The VYBZ wordmark. Uses the official artwork at `/brand/wordmark.svg`
 * (preferred) or `/brand/wordmark.png` once it's dropped into `public/brand/`.
 * Until then it falls back to a styled text lockup so the app always looks
 * intentional — never broken.
 */
export function Wordmark({
  className,
  imgClassName,
  textClassName,
}: {
  className?: string;
  // Kept for API compatibility with existing call sites; unused now that the
  // wordmark renders as text.
  imgClassName?: string;
  textClassName?: string;
}) {
  // Rendered as a styled gradient text lockup rather than an image: the legacy
  // artwork spelled the old brand, and this guarantees the "VYBZ" wordmark reads
  // correctly everywhere until official VYBZ artwork is dropped into
  // `public/brand/`. Economical, professional, on-brand ("VYBZ: Find Yours.").
  void imgClassName;
  return (
    <span
      className={cx(
        "select-none font-display font-black tracking-tight text-gradient",
        textClassName,
        className
      )}
    >
      VYBZ
    </span>
  );
}

/**
 * Brand lockup for headers/nav: the icon mark next to the "myvyb" wordmark.
 * Both fall back gracefully to a hand-built mark / styled text if the official
 * artwork is missing, so the header never looks broken.
 */
export function BrandLockup({
  className,
  markClassName = "h-6 w-6 text-veil-300",
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      <Wordmark imgClassName="h-5 w-auto" textClassName={cx("text-2xl", wordClassName)} />
    </span>
  );
}
