import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppProvider } from "./state/AppContext.jsx";
import { registerSW } from "./pwa/registerSW.js";
import { runSeedIfNeeded } from "./data/seed.js";
import { installDevCheck } from "./data/devCheck.js";
import "./index.css";

// ============================================================
// Bootstrap sequence:
// 1. Run seed (idempotent — no-op after first install).
// 2. Install dev helpers on window.__pt (dev builds only).
// 3. Mount React tree.
// 4. Register service worker.
//
// If the seed fails, we still mount the app but log the error.
// The Config view (Step 8) will expose a "reset DB" action for
// recovery from corrupted state.
// ============================================================

async function bootstrap() {
  try {
    const result = await runSeedIfNeeded();
    if (result.seeded) {
      // eslint-disable-next-line no-console
      console.log("[PharmaTimer] Seed loaded:", result);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[PharmaTimer] Seed failed:", err);
  }

  installDevCheck();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </React.StrictMode>
  );

  registerSW();
}

bootstrap();
