import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@/App";
import { IntroSplash } from "@/components/IntroSplash";
import { SessionProvider } from "@/store/session";
import { primeAudio } from "@/lib/sound";
import "@/index.css";

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
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
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
      <SessionProvider>
        <App />
        <IntroSplash />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>
);
