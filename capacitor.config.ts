// Capacitor wrapper config. Nothing here is installed or generated yet (see docs/STORE-CHECKLIST.md).
// Not part of the Vite build, so it is ignored until @capacitor/cli is installed.
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // TODO_BUNDLE_ID: replace with the reverse-DNS id registered in App Store Connect (cannot change after the first upload).
  appId: "TODO_BUNDLE_ID",
  appName: "Coptic Trivia",
  // The wrapper ships the built app inside the binary; there is no service worker in this app to disable.
  webDir: "dist",
  ios: {
    // Safe areas are handled in CSS (viewport-fit=cover + env(safe-area-inset-*)), so the webview runs edge to edge.
    contentInset: "never",
    backgroundColor: "#3d1f4a",
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#3d1f4a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#3d1f4a",
      overlaysWebView: true,
    },
  },
};

export default config;
