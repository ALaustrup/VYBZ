import type { CapacitorConfig } from "@capacitor/cli";

// MYVYB native shell (iOS + Android, and Android-based Quest). The same Vite
// build (`dist/`) is wrapped by Capacitor — one codebase across web + native.
// Native projects are generated with `npx cap add ios|android` on a machine with
// the platform toolchains (Xcode / Android Studio). See MOBILE_VR_MASTERPLAN.md.
const config: CapacitorConfig = {
  appId: "app.myvyb",
  appName: "MYVYB",
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
