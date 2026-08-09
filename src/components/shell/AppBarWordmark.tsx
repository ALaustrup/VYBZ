import { useEffect, useState } from "react";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * App-bar brand letters (logo wordmark only — no mark icon).
 * Slow hue drift + occasional neon bloom; static when reduce-fx is on.
 */
export function AppBarWordmark({ className }: { className?: string }) {
  const reduce = useReduceFx();
  const [neon, setNeon] = useState(false);

  useEffect(() => {
    if (reduce) return;
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
  }, [reduce]);

  return (
    <span className={cx("app-bar-wordmark", neon && "app-bar-wordmark--neon", className)}>
      <img
        src="/brand/wordmark-letters.svg"
        alt="VYBZ"
        width={112}
        height={22}
        draggable={false}
        className={cx(
          "app-bar-wordmark-img h-[1.05rem] w-auto sm:h-[1.15rem]",
          !reduce && "app-bar-wordmark-img--shift",
        )}
      />
    </span>
  );
}
