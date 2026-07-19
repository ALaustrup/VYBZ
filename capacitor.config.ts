import type { CapacitorConfig } from "@capacitor/cli";

// VYBZ native shell (iOS + Android). The same Vite build (`dist/`) is wrapped by
// Capacitor — one codebase across web + native. Generate platform projects with
// `npx cap add ios|android` on a machine with the platform toolchains.
const config: CapacitorConfig = {
  appId: "cloud.vybz.app",
  appName: "VYBZ",
  webDir: "dist",
  backgroundColor: "#050307",
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#050307",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050307",
    },
  },
};

export default config;
