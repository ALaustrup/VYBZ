/**
 * Retired — post-sign-in tutorial overlay blocked the app when `forge-glass-edge`
 * was misused as the panel container (absolute inset-0 border mask filled the viewport).
 * Kept as a no-op so frozen imports stay valid; do not remount without fixing panel markup.
 */
export function WelcomeTutorial() {
  return null;
}
