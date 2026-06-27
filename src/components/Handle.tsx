import { cx } from "@/lib/utils";

/**
 * Canonical identity renderer. MYVYB identity is the username — emoji identities
 * have been removed entirely. Renders the username when present, otherwise falls
 * back to the per-post/peer display alias, and finally to "Someone".
 */
export function Handle({
  username,
  emoji,
  size = 15,
  className,
}: {
  username?: string | null;
  /** Fallback display name (legacy callers pass an alias here). */
  emoji?: string | null;
  size?: number;
  className?: string;
}) {
  const name = (username && username.trim()) || (emoji && emoji.trim()) || "Someone";
  return (
    <span
      className={cx("font-semibold leading-none", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
