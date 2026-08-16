import { Link } from "react-router-dom";

/**
 * Required originality / rights checkbox for every upload.
 * Wording: original & owned (or rights-cleared remixes of your own material) —
 * not third-party catalog dumps.
 */
export function OriginalityClaim({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 text-left">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 accent-[rgb(var(--neon-cyan))]"
        required
      />
      <span className="text-[12px] leading-relaxed text-white/75">
        <span className="font-semibold text-white/90">I made this, or I own it.</span>
        {" "}
        Don&apos;t upload other people&apos;s music. We will take it down. You deal with
        any copyright claims. See{" "}
        <Link to="/legal/dmca" className="text-cyan-200 underline decoration-cyan-200/40 underline-offset-2" onClick={(e) => e.stopPropagation()}>
          Copyright &amp; DMCA
        </Link>{" "}
        and{" "}
        <Link to="/legal/terms" className="text-cyan-200 underline decoration-cyan-200/40 underline-offset-2" onClick={(e) => e.stopPropagation()}>
          Terms
        </Link>
        .
      </span>
    </label>
  );
}
