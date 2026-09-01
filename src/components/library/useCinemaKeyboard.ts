import { useEffect, type RefObject } from "react";
import {
  cinemaActiveTileIndex,
  cinemaKeyboardIsGalleryNav,
  cinemaKeyboardTargetIsControl,
} from "@/features/library/libraryPreview";

/** Cinema arrows snap between works. Space is a tap. Arrows never start AudioBus. */
export function useCinemaKeyboard({
  cinema,
  filtersOpen,
  visualOpen,
  reduceFx,
  scrollRef,
}: {
  cinema: boolean;
  filtersOpen: boolean;
  visualOpen: boolean;
  reduceFx: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!cinema) return;
    function onKey(e: KeyboardEvent) {
      if (
        !cinemaKeyboardIsGalleryNav({
          cinema: true,
          targetIsControl: cinemaKeyboardTargetIsControl(e.target),
          visualOpen,
          filtersOpen,
        })
      ) {
        return;
      }
      const root = scrollRef.current;
      if (!root) return;
      const tiles = [...root.querySelectorAll<HTMLElement>(".library-cinema-tile")];
      if (!tiles.length) return;
      const index = cinemaActiveTileIndex({
        scrollTop: root.scrollTop,
        viewport: root.clientHeight,
        count: tiles.length,
      });
      const behavior: ScrollBehavior = reduceFx ? "auto" : "smooth";
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        const next = tiles[Math.min(tiles.length - 1, index + 1)];
        root.scrollTo({ top: next.offsetTop, behavior });
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const prev = tiles[Math.max(0, index - 1)];
        root.scrollTo({ top: prev.offsetTop, behavior });
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        root.scrollTo({ top: 0, behavior });
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        const last = tiles[tiles.length - 1];
        root.scrollTo({ top: last.offsetTop, behavior });
        return;
      }
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        tiles[index]?.querySelector<HTMLButtonElement>('[data-testid="library-cinema-tap"]')?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinema, filtersOpen, visualOpen, reduceFx, scrollRef]);
}
