import { avatarGradient, cx } from "@/lib/utils";

/** Identity avatar — photo when available, otherwise a stable gradient initial. */
export function Avatar({
  url,
  name,
  id,
  size = "md",
  className,
  square,
}: {
  url?: string | null;
  name?: string | null;
  id?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  square?: boolean;
}) {
  const key = name || id || "?";
  const [c0, c1] = avatarGradient(key);
  const initial = (name || "?").charAt(0).toUpperCase();
  const dim =
    size === "xl" ? "h-24 w-24 text-3xl"
      : size === "lg" ? "h-16 w-16 text-2xl"
        : size === "sm" ? "h-9 w-9 text-sm"
          : "h-11 w-11 text-base";
  const radius = square ? (size === "xl" ? "rounded-3xl" : "rounded-2xl") : "rounded-full";

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name} avatar` : "Avatar"}
        className={cx("shrink-0 object-cover", dim, radius, className)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center font-display font-bold text-white",
        dim,
        radius,
        className,
      )}
      style={{ background: `linear-gradient(150deg, ${c0}, ${c1})` }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
