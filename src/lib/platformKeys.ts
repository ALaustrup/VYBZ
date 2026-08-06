/**
 * Which modifier label to show in shortcut hints.
 *
 * Read at call time rather than cached, so tests and the desktop shell can
 * exercise both branches without module reloading.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const source = `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
  return /mac|iphone|ipad|ipod/i.test(source);
}
