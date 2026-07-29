import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@/App";
import { IntroSplash } from "@/components/IntroSplash";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { SessionProvider } from "@/store/session";
import { primeAudio } from "@/lib/sound";
/* Self-hosted — no Google CDN / CSP / network flake.
 * Typography (screen-clarity stack):
 * - Lexend — research-backed reading proficiency, high x-height, full weight range for UI/body
 * - Atkinson Hyperlegible — Braille Institute; max I/l/1 and 0/O disambiguation for headlines & tiny chrome
 */
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/lexend/700.css";
import "@fontsource/lexend/800.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/400-italic.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/atkinson-hyperlegible/700-italic.css";
import "@/index.css";

if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = "smoke";
  document.documentElement.style.colorScheme = "dark";
}

// Unlock the audio context on the first user gesture (a browser requirement).
if (typeof window !== "undefined") {
  const unlock = () => {
    primeAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

if ("serviceWorker" in navigator) {
  // Dev: never let a stale PWA precache / autoUpdate reload-loop mask HMR.
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    }).catch(() => undefined);
  } else {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    void navigator.serviceWorker.ready
      .then((reg) => reg.update())
      .catch(() => undefined);
  }
}

/** Native shell polish — StatusBar / Splash / Keyboard (no-op on web). */
async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#050307" });
  } catch { /* plugin optional on web builds */ }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch { /* ignore */ }
  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch { /* ignore */ }
}
void initNativeShell();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider>
        <SessionProvider>
          <App />
          <IntroSplash />
        </SessionProvider>
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>
);
