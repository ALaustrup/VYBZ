import { useReduceFx } from "@/lib/display";

/**
 * Shared matte-futurist atmosphere — hex lattice, slow pulse rings, void gradient.
 * Used on landing, auth, and static boot surfaces.
 */
export function GeometricBackdrop({ intensity = "normal" }: { intensity?: "subtle" | "normal" | "hero" }) {
  const reduce = useReduceFx();
  const ringOpacity = intensity === "hero" ? 0.55 : intensity === "subtle" ? 0.28 : 0.4;

  return (
    <div className="nexus-void pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="nexus-hex-grid" />
      {!reduce && (
        <>
          <span
            className="nexus-pulse-ring"
            style={{
              top: "12%",
              left: "50%",
              width: "min(90vw, 640px)",
              height: "min(90vw, 640px)",
              marginLeft: "calc(min(90vw, 640px) / -2)",
              opacity: ringOpacity,
              animationDelay: "0s",
            }}
          />
          <span
            className="nexus-pulse-ring"
            style={{
              bottom: "8%",
              left: "20%",
              width: "min(60vw, 420px)",
              height: "min(60vw, 420px)",
              marginLeft: "calc(min(60vw, 420px) / -2)",
              opacity: ringOpacity * 0.65,
              animationDelay: "-2.5s",
            }}
          />
          <span
            className="nexus-pulse-ring"
            style={{
              top: "38%",
              right: "8%",
              width: "min(40vw, 280px)",
              height: "min(40vw, 280px)",
              opacity: ringOpacity * 0.45,
              animationDelay: "-4s",
            }}
          />
        </>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />
    </div>
  );
}
