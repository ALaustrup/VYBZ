import { useEffect, useRef, useState, type RefObject } from "react";
import { cinemaChromeShouldHide } from "@/features/library/libraryPreview";

const SETTLE_MS = 1400;
const REVEAL_MS = 3200;

/** Cinema overlay recedes after playback settles or the gallery scrolls. */
export function useCinemaChrome({
  cinema,
  filtersOpen,
  playing,
  reduceFx,
  scrollRef,
}: {
  cinema: boolean;
  filtersOpen: boolean;
  playing: boolean;
  reduceFx: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [playingSettled, setPlayingSettled] = useState(false);
  const [hold, setHold] = useState(false);
  const holdTimer = useRef(0);

  useEffect(() => {
    if (!cinema || !playing || reduceFx || filtersOpen || hold) {
      setPlayingSettled(false);
      return;
    }
    const t = window.setTimeout(() => setPlayingSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [cinema, playing, reduceFx, filtersOpen, hold]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !cinema) {
      setScrolled(false);
      return;
    }
    const onScroll = () => {
      setHold(false);
      setScrolled(el.scrollTop > 12);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [cinema, scrollRef]);

  const hidden = cinemaChromeShouldHide({
    cinema,
    filtersOpen,
    reduceFx,
    hold,
    scrolled,
    playingSettled,
  });

  return {
    hidden,
    reveal: () => {
      setPlayingSettled(false);
      setHold(true);
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => setHold(false), REVEAL_MS);
    },
    onToolsFocus: () => {
      window.clearTimeout(holdTimer.current);
      setHold(true);
    },
    onToolsBlur: (related: EventTarget | null, current: EventTarget | null) => {
      if (current instanceof Element && related instanceof Node && current.contains(related)) return;
      setHold(false);
    },
  };
}
