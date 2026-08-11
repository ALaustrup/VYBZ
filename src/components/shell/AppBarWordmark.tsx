import { useEffect, useRef, useState } from "react";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * App-bar brand letters (logo wordmark only — no mark icon).
 * When `reactive`, pulses with V-Dock / AudioBus energy while playing.
 * Slow hue drift when idle; static when reduce-fx is on.
 */
export function AppBarWordmark({
  className,
  reactive = true,
}: {
  className?: string;
  reactive?: boolean;
}) {
  const reduce = useReduceFx();
  const { playing } = usePlayer();
  const [neon, setNeon] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (reduce || reactive) return;
    let cancelled = false;
    let waitId = 0;
    let holdId = 0;

    const arm = () => {
      const delayMs = 4200 + Math.random() * 11000;
      waitId = window.setTimeout(() => {
        if (cancelled) return;
        setNeon(true);
        holdId = window.setTimeout(() => {
          if (cancelled) return;
          setNeon(false);
          arm();
        }, 700 + Math.random() * 900);
      }, delayMs);
    };

    arm();
    return () => {
      cancelled = true;
      window.clearTimeout(waitId);
      window.clearTimeout(holdId);
    };
  }, [reduce, reactive]);

  useEffect(() => {
    const img = imgRef.current;
    if (!reactive || !img) return;
    const reset = () => {
      img.style.filter = "";
      img.style.transform = "";
    };
    if (reduce) {
      if (playing) {
        img.style.filter = "brightness(1.25) saturate(1.3) drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.7))";
      } else reset();
      return;
    }
    if (!playing) {
      reset();
      return;
    }
    let raf = 0;
    let eased = 0;
    let base = 0;
    let sc = 0.02;
    const tick = () => {
      if (!playing) {
        reset();
        return;
      }
      const b = readBands();
      const v = b.bass * 0.7 + b.level * 0.3;
      base += (v - base) * (base ? 0.03 : 1);
      const dev = v - base;
      sc += (Math.abs(dev) - sc) * 0.05;
      const norm = dev / Math.max(sc * 1.3, 0.006);
      const pulse = Math.max(-1, Math.min(1.6, norm));
      const target = Math.max(0.08, 0.45 + pulse * 0.75);
      eased += (target - eased) * (target > eased ? 0.55 : 0.22);
      const g = eased;
      img.style.filter = [
        `brightness(${(1 + g * 0.5).toFixed(3)})`,
        `saturate(${(1 + g * 0.55).toFixed(3)})`,
        `drop-shadow(0 0 ${(4 + g * 10).toFixed(1)}px rgb(var(--accent-rgb) / ${(0.35 + g * 0.55).toFixed(2)}))`,
        `drop-shadow(0 0 ${(10 + g * 16).toFixed(1)}px rgb(0 255 180 / ${(0.2 + g * 0.4).toFixed(2)}))`,
      ].join(" ");
      img.style.transform = `scale(${(1 + Math.min(0.08, g * 0.06)).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      reset();
    };
  }, [reactive, playing, reduce]);

  return (
    <span
      className={cx("app-bar-wordmark", !reactive && neon && "app-bar-wordmark--neon", className)}
      data-reactive={reactive ? (playing ? "playing" : "idle") : undefined}
    >
      <img
        ref={imgRef}
        src="/brand/wordmark-letters.svg"
        alt="VYBZ"
        width={112}
        height={22}
        draggable={false}
        className={cx(
          "app-bar-wordmark-img h-[1.05rem] w-auto sm:h-[1.15rem]",
          !reduce && !reactive && "app-bar-wordmark-img--shift",
          reactive && !playing && !reduce && "app-bar-wordmark-img--shift",
        )}
      />
    </span>
  );
}
