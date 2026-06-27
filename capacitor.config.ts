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
};

export default config;
