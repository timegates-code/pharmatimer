// ============================================================
// EmptyStateZeroFarmaci — Q-UX.3 (CP3 v3.0.0 Step 1).
// ============================================================
// Rendered by OggiView when state.farmaci attivi is empty AND
// today has no plan entries. CTA links to /config/farmaci where
// the user can add the first farmaco.
//
// par.6.169 — CTA simplified: links to /config/farmaci (no query
// param + URLSearchParams handler). Auto-open drawer scope future.
// ============================================================

import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme.js";

export default function EmptyStateZeroFarmaci() {
  const { tokens: t } = useTheme();
  return (
    <div
      className="px-4 mt-12 text-center"
      data-testid="empty-state-zero-farmaci"
    >
      <div className="text-6xl mb-4 opacity-50" aria-hidden="true">
        📋
      </div>
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: t.textPrimary }}
      >
        Nessun farmaco configurato
      </h2>
      <p className="text-sm mb-6" style={{ color: t.textSecondary }}>
        Aggiungi il tuo primo farmaco per iniziare a ricevere
        promemoria sulle dosi.
      </p>
      <Link
        to="/config/farmaci"
        className="inline-block px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        data-testid="empty-state-cta"
      >
        + Aggiungi il tuo primo farmaco
      </Link>
    </div>
  );
}
