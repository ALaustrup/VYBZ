import { cx } from "@/lib/utils";

/** Brand + legal line. Year is computed so it never goes stale. */
export function Copyright({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <p
      className={cx(
        "text-center text-[11px] leading-relaxed text-white/30",
        className
      )}
    >
      <span className="font-display font-semibold tracking-[0.2em] text-white/45">
        MYVYB
      </span>
      <br />
      &copy; {year} Astra Matrix, Inc. All rights reserved.
    </p>
  );
}
