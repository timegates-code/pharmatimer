// ============================================================
// UpdatePrompt — toast notifying user of new SW version.
// Sessione 10-B CP4 (AMB-10.A + AMB-10.C + §6.153).
//
// Subscribes to `subscribeUpdateAvailable` from the registerSW module.
// When the SW signals `onNeedRefresh`, the toast appears bottom-fixed
// above the NavBar (z-50, bottom-20 to clear NavBar's pb-6 area). User
// can click "Ricarica" to apply the update (triggers reload via
// `triggerUpdate`) or dismiss it locally with the close icon (no
// reload). On a subsequent fire of `onNeedRefresh` the toast reappears
// (dismiss flag reset on each `true` signal).
//
// Accessibility:
//   role="alert" + aria-live="polite" — non-blocking announcement.
//   Close button has aria-label "Chiudi notifica aggiornamento".
//
// Theming: token-aware via useTheme() (AMB-7a.G pattern, NavBar-style).
// Primary action uses t.blue with adaptive text color (white on light
// mode where t.blue is saturated #2563EB; dark on dark mode where t.blue
// is lighter #60A5FA — preserves WCAG AA contrast).
// ============================================================

import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import {
  subscribeUpdateAvailable,
  triggerUpdate,
} from '../../pwa/registerSW.js';

export default function UpdatePrompt() {
  const { dark, tokens: t } = useTheme();
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeUpdateAvailable((value) => {
      setAvailable(value);
      // Reset local dismiss when a fresh update arrives so the toast
      // reappears on the next deploy in the same session.
      if (value) setDismissed(false);
    });
    return unsubscribe;
  }, []);

  if (!available || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 inset-x-4 z-50 rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md mx-auto"
      style={{
        background: t.modalBg,
        border: `1px solid ${t.headerBorder}`,
        color: t.textPrimary,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">Nuova versione disponibile</div>
        <div className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
          Ricarica per applicare l&rsquo;aggiornamento.
        </div>
      </div>
      <button
        type="button"
        onClick={() => triggerUpdate()}
        className="px-3 py-1.5 rounded text-sm font-medium"
        style={{ background: t.blue, color: dark ? '#15141A' : '#FFFFFF' }}
      >
        Ricarica
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Chiudi notifica aggiornamento"
        className="p-1 rounded"
        style={{ color: t.textMuted }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
