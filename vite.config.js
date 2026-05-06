import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { buildPwaManifest } from "./src/config/pwaManifest.js";

// Vite config with PWA plugin. Service worker is auto-generated (generateSW strategy).
export default defineConfig({
  base: '/pharmatimer/',
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "favicon.svg"],
      manifest: buildPwaManifest("/pharmatimer/"),
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Icons fallback: CacheFirst for any /icons/* request not already in precache.
          // Precache (globPatterns) covers build-time assets; this runtime rule guards
          // against future dynamic icon loads (e.g. profile avatars).
          {
            urlPattern: /\/icons\/.*\.(?:png|svg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "pt-icons",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
          // Google Fonts (commented — uncomment if remote webfonts are added):
          // {
          //   urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
          //   handler: "CacheFirst",
          //   options: {
          //     cacheName: "pt-google-fonts",
          //     expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
          //   }
          // },
          // API (Phase 3 — uncomment when FastAPI backend is wired):
          // {
          //   urlPattern: /\/api\/.*/,
          //   handler: "NetworkFirst",
          //   options: {
          //     cacheName: "pt-api",
          //     networkTimeoutSeconds: 5,
          //     expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
          //   }
          // }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["node_modules", "dist", ".sessione*-backup-*/**"]
  }
});
