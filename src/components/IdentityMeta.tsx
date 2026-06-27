import { MapPin } from "lucide-react";
import type { Gender } from "@/types";
import { cx } from "@/lib/utils";

interface IdentityMetaProps {
  gender?: Gender;
  age?: number;
  location?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders a confession author's optional self-disclosure (gender, age, area).
 * Every field is opt-in, so this component renders nothing when the author
 * chose full anonymity — keeping anonymous cards visually clean.
 */
export function IdentityMeta({
  gender,
  age,
  location,
  size = "md",
  className,
}: IdentityMetaProps) {
  if (!gender && !age && !location) return null;

  const text = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-1.5 text-white/60",
        text,
        className
      )}
    >
      {gender && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 font-semibold"
          aria-label={gender === "F" ? "Female" : "Male"}
        >
          {gender === "F" ? "♀" : "♂"}
          {gender}
        </span>
      )}
      {age != null && (
        <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 font-semibold">
          {age}
        </span>
      )}
      {location && (
        <span className="inline-flex items-center gap-0.5">
          <MapPin className="h-3 w-3" />
          {location}
        </span>
      )}
    </div>
  );
}
