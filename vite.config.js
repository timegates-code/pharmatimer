import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Vite config with PWA plugin. Service worker is auto-generated (generateSW strategy).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "PharmaTimer",
        short_name: "PharmaTimer",
        description: "Gestione terapia farmacologica quotidiana",
        theme_color: "#15141A",
        background_color: "#FAFAF7",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: "jsdom",
    globals: true
  }
});
