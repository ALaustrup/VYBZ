interface VeiledPhotoProps {
  src: string;
  revealed?: boolean;
  /** Community reveal level 0..1 (overrides `revealed` when provided). */
  level?: number;
  /** NSFW photos blur harder while veiled. */
  nsfw?: boolean;
  /** Bottom caption scrim (for text-over-media). Off for plain media viewers. */
  scrim?: boolean;
  className?: string;
}

/**
 * A real uploaded photo, shown artfully veiled (heavy blur + scale + vignette)
 * until unveiled, when it animates to crisp. Mirrors VeiledArt's treatment so
 * generated and uploaded confessions feel like one cohesive system.
 */
export function VeiledPhoto({
  src,
  revealed = false,
  level,
  nsfw = false,
  scrim = true,
  className,
}: VeiledPhotoProps) {
  const lvl = level != null ? Math.max(0, Math.min(1, level)) : revealed ? 1 : 0;
  const maxBlur = nsfw ? 64 : 48;
  // Crisp at full clarity (0 blur); veils progressively as the community Veils it.
  const blurPx = lvl >= 0.985 ? 0 : (1 - lvl) * maxBlur;
  const brightness = 0.78 + lvl * 0.22;
  const blurred = blurPx > 0.5;
  const scale = blurred ? 1.06 + (1 - lvl) * 0.2 : 1;
  return (
    <div
      className={className}
      data-protect-media
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#191c22",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: blurred ? "-10%" : 0,
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: blurPx
            ? `blur(${blurPx}px) saturate(1.05) brightness(${brightness})`
            : "none",
          transform: `scale(${scale})`,
          transition:
            "filter 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      {/* Bottom scrim for caption legibility — light, only for text-over-media. */}
      {scrim && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(5,3,7,0.72) 0%, transparent 42%)",
          }}
        />
      )}
    </div>
  );
}
