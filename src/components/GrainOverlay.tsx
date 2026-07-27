// A whisper-quiet film grain over the whole app. Breaks up flat gradients so the
// glass reads as a real surface instead of a smooth CSS wash — the "soft depth"
// from the premium-feel direction (§12.4). Pure CSS: one fixed, click-through
// layer with an inline SVG fractal-noise data URI. No animation, no cost.
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>` +
      `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>` +
      `<feColorMatrix type='saturate' values='0'/></filter>` +
      `<rect width='100%' height='100%' filter='url(#n)'/></svg>`
  );

export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[5]"
      style={{
        backgroundImage: `url("${NOISE}")`,
        backgroundRepeat: "repeat",
        opacity: 0.02,
        mixBlendMode: "multiply",
      }}
    />
  );
}
