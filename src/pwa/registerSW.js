// Service worker registration via vite-plugin-pwa virtual module.
export function registerSW() {
  if ("serviceWorker" in navigator) {
    // Dynamic import so dev builds without the plugin still work.
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        registerSW({
          onNeedRefresh() {
            // Optional: prompt user to reload for new version.
            console.log("[PWA] New version available.");
          },
          onOfflineReady() {
            console.log("[PWA] Ready to work offline.");
          }
        });
      })
      .catch(() => {
        // Plugin not available (e.g. first dev run). Safe to ignore.
      });
  }
}
