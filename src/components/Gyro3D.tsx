import { useEffect, useRef, type ReactNode } from "react";

interface Gyro3DProps {
  children: ReactNode;
  /** Disable to render a plain layer (e.g. when the user didn't pay for it). */
  enabled?: boolean;
  /** Max tilt in degrees. */
  max?: number;
  className?: string;
}

/**
 * Premium "gyroscopic" parallax view. Tilts its child media in 3D as the device
 * moves (gyroscope, where granted) or as the pointer moves over it (desktop /
 * hover). Purely presentational and gracefully inert when `enabled` is false or
 * the device offers no motion. Respects prefers-reduced-motion.
 */
export function Gyro3D({ children, enabled = true, max = 12, className }: Gyro3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const inner = innerRef.current;
    const wrap = wrapRef.current;
    if (!inner || !wrap) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const apply = () => {
      // Ease toward the target for a smooth, weighty feel.
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      inner.style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg) scale(1.06)`;
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    const onPointer = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tx = px * max * 2;
      ty = -py * max * 2;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      // gamma: left/right [-90,90], beta: front/back [-180,180].
      const g = e.gamma ?? 0;
      const b = (e.beta ?? 0) - 45; // hold ~45° as the neutral reading angle
      tx = Math.max(-max, Math.min(max, (g / 45) * max));
      ty = Math.max(-max, Math.min(max, (-b / 45) * max));
    };

    wrap.addEventListener("pointermove", onPointer);
    wrap.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onOrient);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onPointer);
      wrap.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
      if (inner) inner.style.transform = "";
    };
  }, [enabled, max]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ perspective: 900, perspectiveOrigin: "center" }}
    >
      <div
        ref={innerRef}
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          willChange: "transform",
          transition: "transform 0.1s linear",
        }}
      >
        {children}
      </div>
    </div>
  );
}
