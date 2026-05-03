// ============================================================
// ErrorSurface — runtime error surface for state.error.
//
// Sessione Step 11-A CP1b (AMB-11.A.3, Q1=A single-slot model):
//   Reads state.error from AppContext and renders one of two surfaces
//   based on severity (CP1a vocabulary, see RepositoryError.js):
//
//     severity ∈ {warning, error}  → TOAST
//                                    Auto-dismisses after TOAST_DISMISS_MS.
//                                    Manually dismissable via close button.
//                                    Positioned bottom-of-screen above NavBar.
//
//     severity === 'critical'      → BANNER
//                                    Persistent (no auto-dismiss).
//                                    Manually dismissable via close button.
//                                    Pinned to top-of-screen above the header.
//                                    Shows error.code if present (debug aid).
//
// Scope (deviation §6.NN, ratified CP0 round 4): ErrorSurface ADDS a runtime
// surface. The full-screen INIT failure UI in OggiView.jsx (state.status ===
// 'error', "Riprova" button) is left untouched — that lives in a different
// state population (state.status, not state.error) and serves a different
// purpose (no app without repo init). The CP1b stub in §22.33 said
// "sostituzione inline render error riga 288" but Mac-side audit showed
// riga 288 is the INIT screen, not a runtime catch site, so it stays as is.
//
// A11y note (Q2=A): accessibility announcements (aria-live region) are
// mounted in App.jsx (CP4), reading state.error.message into a single
// sr-only live region. ErrorSurface itself carries no role/aria-live to
// avoid double-announcement.
//
// Backward-compat: if state.error has no `severity` field (legacy CP1a
// shape), defaults to 'error' (toast). Reducer test in CP1a already
// validates legacy passthrough.
// ============================================================

import { useEffect } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';

const TOAST_DISMISS_MS = 4000;

export default function ErrorSurface() {
  const { state, dispatch } = useAppContext();
  const { tokens: t } = useTheme();
  const error = state.error;

  // Auto-dismiss timer for warning / error toasts.
  // Critical banners persist until manually dismissed.
  useEffect(() => {
    if (!error) return undefined;
    const severity = error.severity ?? 'error';
    if (severity === 'critical') return undefined;

    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_ERROR' });
    }, TOAST_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [error, dispatch]);

  if (!error) return null;

  const severity = error.severity ?? 'error';
  const isCritical = severity === 'critical';
  const message = error.message ?? 'Si è verificato un errore';

  const handleDismiss = () => dispatch({ type: 'CLEAR_ERROR' });

  // Severity → token mapping
  let bg;
  let bd;
  let tx;
  if (severity === 'warning') {
    bg = t.amberBg;
    bd = t.warnBd ?? t.amberTx;
    tx = t.amberTx;
  } else if (severity === 'critical') {
    bg = t.modalAlertBg;
    bd = t.modalAlertBd;
    tx = t.modalAlertTx;
  } else {
    // 'error' (default) and any unknown severity falls back here
    bg = t.redBg;
    bd = t.red;
    tx = t.redTx;
  }

  if (isCritical) {
    return (
      <div
        data-testid="error-surface-banner"
        className="fixed top-0 left-0 right-0 z-[60] px-4 py-3"
        style={{
          background: bg,
          borderBottom: `1px solid ${bd}`,
          color: tx,
        }}
      >
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <div className="flex-1 text-sm">
            <div className="font-semibold mb-0.5">{message}</div>
            {error.code ? (
              <div
                className="text-xs opacity-70"
                data-testid="error-surface-code"
              >
                [{error.code}]
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            data-testid="error-surface-dismiss"
            aria-label="Chiudi"
            className="px-2 py-1 text-sm font-bold leading-none"
            style={{ color: tx, background: 'transparent', border: 'none' }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Toast (warning / error)
  return (
    <div
      data-testid="error-surface-toast"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 rounded-lg px-3 py-2 shadow-lg"
      style={{
        background: bg,
        border: `1px solid ${bd}`,
        color: tx,
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm">{message}</div>
        <button
          type="button"
          onClick={handleDismiss}
          data-testid="error-surface-dismiss"
          aria-label="Chiudi"
          className="px-1 text-sm font-bold leading-none"
          style={{ color: tx, background: 'transparent', border: 'none' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
