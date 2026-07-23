import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Aloud native shell. Capacitor wraps the SAME live web app in a native
 * container on iOS and Android, with native camera/mic entitlements, so the
 * accessibility layer and every flow stay exactly as shipped on the web. The
 * shell loads the deployed app over https (server.url) because the app relies
 * on server-side Route Handlers for its secret-holding API and so cannot be
 * statically exported. The web app remains the product; this is packaging.
 */
const config: CapacitorConfig = {
  appId: "com.aloudbeauty.app",
  appName: "Aloud",
  webDir: "native/www",
  server: {
    url: "https://aloudbeauty.vercel.app",
    iosScheme: "https",
    androidScheme: "https",
  },
};

export default config;
