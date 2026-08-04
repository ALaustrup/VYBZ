import { buildLabel } from "@/lib/buildInfo";

/** Visible build fingerprint — helps verify production vs stale cache. */
export function BuildStamp({ className = "" }: { className?: string }) {
  const label = buildLabel();
  return (
    <p
      className={`font-mono text-[10px] tracking-wide text-white/35 ${className}`.trim()}
      data-testid="build-sha"
      title="Deployment build"
    >
      Build {label}
    </p>
  );
}
