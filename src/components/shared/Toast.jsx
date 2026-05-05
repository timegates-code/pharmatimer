// ============================================================
// Toast — global ephemeral feedback message (CP5 v3.0.0 Step 1).
// ============================================================
//
// §6.176: reads `state.toast` from AppContext via `selectToast` and
// renders a fixed-position pill at the top-center of the viewport.
// Mounted once at the App.jsx level (inside ThemedShell, sopra
// `<Routes>`) so it survives navigation Oggi ↔ Config without
// re-mount cycles.
//
// Re-arm semantics (Q-UX.5):
//   - useEffect tracks `toast?.key`. When a new toast is dispatched
//     the key changes (Date.now() at dispatch) and the auto-dismiss
//     timer is rearmed even if the message text is identical.
//   - Manual dismiss: tap on the toast body → dispatchsToast.
//
// Stile (Q-UX.5):
//   - bg `t.greenBg`, border 1px `t.greenTx`, text `t.greenTx`.
//   - max-width 90vw mobile / 480px desktop.
//   - z-index 50 — sopra sticky header (z-30) / date separator (z-20)
//     / nav bar (z-30); sotto i drawer modali (z-50 with backdrop —
//     ma il drawer si chiude prima del toast trigger CP5 commitSave,
//     quindi nessun conflitto pratico).
//
// §6.177: il trigger Mit-C (showToast) è caller-side in
// FarmaciTab.commitSave; questo componente si limita a reagire allo
// stato globale.
// ============================================================

import { useEffect } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { selectToast } from '../../state/selectors.js';

const AUTO_DISMISS_MS = 4000;

export default function Toast() {
  const { state, actions } = useAppContext();
  const { tokens: t } = useTheme();
  const toast = selectToast(state);

  // Auto-dismiss timer rearmed on every key change.
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => {
      actions.dismissToast();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
    // Re-run on key change so identical messages can re-arm cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  if (!toast) return null;

  return (
    <div
      data-testid="toast"
      role="status"
      aria-live="polite"
      onClick={() => actions.dismissToast()}
      className="fixed left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer select-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        background: t.greenBg,
        color: t.greenTx,
        border: `1px solid ${t.greenTx}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: 'min(90vw, 480px)',
        zIndex: 50,
      }}
    >
      {toast.message}
    </div>
  );
}
