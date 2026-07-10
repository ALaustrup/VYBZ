import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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
