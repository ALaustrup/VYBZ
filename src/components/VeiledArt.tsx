import { useMemo } from "react";
import { paletteFor, seededRandom } from "@/lib/utils";

interface VeiledArtProps {
  seed: number;
  /** When true the artwork is sharp and saturated; otherwise it's veiled. */
  revealed?: boolean;
  /** Clarity level 0..1 (1 = crisp, 0 = fully veiled). */
  level?: number;
  className?: string;
}

interface Blob {
  x: number;
  y: number;
  r: number;
  color: string;
  opacity: number;
}

/**
 * Procedural "veiled photo".
 *
 * Rather than depend on remote imagery (which would break offline and pollute
 * the premium feel with loading states), each confession renders a deterministic
 * mesh of glowing blobs derived from its seed and category palette. The same
 * artwork is shown blurred (veiled) or crisp (revealed) so the double-tap reveal
 * reads as a genuine transformation of one image.
 */
export function VeiledArt({
  seed,
  revealed = false,
  level,
  className,
}: VeiledArtProps) {
  const palette = paletteFor(seed);
  // Reveal level drives the blur; fall back to the boolean for simple previews.
  const lvl = level != null ? Math.max(0, Math.min(1, level)) : revealed ? 1 : 0;
  const blurPx = 2 + (1 - lvl) * 50;
  const brightness = 0.7 + lvl * 0.35;
  const scale = 1.04 + (1 - lvl) * 0.32;

  const blobs = useMemo<Blob[]>(() => {
    const rand = seededRandom(seed);
    const count = 5;
    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: 30 + rand() * 45,
      color: palette[Math.floor(rand() * palette.length)],
      opacity: 0.45 + rand() * 0.4,
    }));
  }, [seed, palette]);

  const grainSeed = useMemo(() => Math.floor(seededRandom(seed)() * 1000), [seed]);

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: palette[2],
      }}
    >
      {/* Layered radial gradients form the "photo". */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          filter: `blur(${blurPx}px) saturate(1.15) brightness(${brightness})`,
          transform: `scale(${scale})`,
          transition:
            "filter 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {blobs.map((blob, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${blob.x}%`,
              top: `${blob.y}%`,
              width: `${blob.r}%`,
              height: `${blob.r}%`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              opacity: blob.opacity,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </div>

      {/* Fine grain to give the gradients a filmic, expensive texture. */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.08 + lvl * 0.06,
          transition: "opacity 700ms ease",
          mixBlendMode: "overlay",
        }}
      >
        <filter id={`grain-${grainSeed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${grainSeed})`} />
      </svg>

      {/* A vignette keeps text legible and adds depth. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 50% 0%, transparent 30%, rgba(5,3,7,0.55) 100%), linear-gradient(to top, rgba(5,3,7,0.92) 4%, transparent 55%)",
        }}
      />
    </div>
  );
}
