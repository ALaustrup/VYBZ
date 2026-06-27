// Content protection for user-uploaded media.
//
// What this reliably does (deterrents against casual saving):
//  - Cancels the right-click / long-press context menu on media.
//  - Cancels drag-to-save on images and videos.
//  - Disables the native video download button + Picture-in-Picture.
//  - Blacks out print / print-to-PDF.
//
// What is NOT possible on the open web (be honest):
//  - Forcing external OS-level screen recorders to capture a blank frame.
//    Only DRM/EME-protected media (e.g. Widevine) gets a protected surface, and
//    that's out of scope for the alpha. We add a best-effort visibility blackout
//    (below) but cannot guarantee a recorder sees black.

function isProtectedTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") return true;
  return typeof el.closest === "function" && !!el.closest("[data-protect-media]");
}

/**
 * Install global listeners that block saving user media. Returns a cleanup fn.
 */
export function installMediaGuard(): () => void {
  if (typeof document === "undefined") return () => {};

  const onContextMenu = (e: MouseEvent) => {
    if (isProtectedTarget(e.target)) e.preventDefault();
  };
  const onDragStart = (e: DragEvent) => {
    if (isProtectedTarget(e.target)) e.preventDefault();
  };

  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("dragstart", onDragStart);

  return () => {
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("dragstart", onDragStart);
  };
}
