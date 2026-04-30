// ============================================================
// registerSW — service worker registration + update notification.
// Sessione 10-B CP4 (§6.153): rewrite scaffold 9-B per AMB-10.A.
//
// API:
//   setupPWA()                       — bootstrap: registers SW via
//                                      vite-plugin-pwa virtual module.
//                                      Idempotent (guard: registered flag).
//                                      Returns a Promise that resolves
//                                      once the dynamic import settles
//                                      (used by tests; main.jsx ignores).
//   subscribeUpdateAvailable(cb)     — register listener for update flag.
//                                      Returns unsubscribe function.
//                                      Late subscribers receive current
//                                      flag immediately (sync replay).
//   triggerUpdate()                  — invoke updateSW() to apply update
//                                      and reload. No-op if SW not yet
//                                      registered or plugin missing.
//
// AMB-10.A motivation (medical context): hybrid autoUpdate + prompt UI.
// User must consciously trigger reload to avoid losing volatile state
// (e.g. mid-intake) on PWA refresh.
// ============================================================

let updateSWRef = null;
let updateAvailable = false;
let registered = false;
const listeners = new Set();

function notifyAll(value) {
  listeners.forEach((cb) => {
    try {
      cb(value);
    } catch {
      // Listener errors must not break the notification chain.
    }
  });
}

export function setupPWA() {
  if (registered) return Promise.resolve();
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve();
  }
  registered = true;

  // Dynamic import so dev builds without the plugin still work.
  return import('virtual:pwa-register')
    .then(({ registerSW }) => {
      updateSWRef = registerSW({
        onNeedRefresh() {
          updateAvailable = true;
          notifyAll(true);
        },
        onOfflineReady() {
          // eslint-disable-next-line no-console
          console.log('[PWA] Ready to work offline.');
        },
      });
    })
    .catch(() => {
      // Plugin not available (e.g. first dev run). Safe to ignore.
      registered = false;
    });
}

export function subscribeUpdateAvailable(cb) {
  listeners.add(cb);
  // Late-subscriber sync: replay current flag immediately.
  cb(updateAvailable);
  return () => {
    listeners.delete(cb);
  };
}

export function triggerUpdate() {
  if (typeof updateSWRef === 'function') {
    updateSWRef();
  }
}

// Test-only: reset module-level state. Not part of the public API.
export function __TEST_ONLY_reset() {
  updateSWRef = null;
  updateAvailable = false;
  registered = false;
  listeners.clear();
}
