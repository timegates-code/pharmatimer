import { useTheme } from '../../hooks/useTheme.js';

// ============================================================
// UnsavedChangesModal — confirm dialog for dirty-state navigation.
// ============================================================
//
// Scope CP7 Sessione 8a (AMB-8a.E — "inline ≤15 righe"
// estensibile in 8b al 2° consumer). Scope-minimal:
//   - semi-transparent backdrop (modalOverlay token)
//   - box with title + body + 2 buttons (Annulla / Scarta e continua)
//   - ZERO focus-trap (deferred to 8d polish)
//   - ZERO backdrop-click dismiss (deferred; buttons only)
//
// Consumer (single, at 8a time): ConfigView. When a 2° consumer
// arrives in 8b (or later), extract shared dialog primitives
// (backdrop + dialog box + footer button row) into a reusable
// Modal base — current codebase already has `useModalA11y` hook
// that covers focus trap; wire it in then.

export default function UnsavedChangesModal({ onCancel, onDiscard }) {
  const { tokens: t } = useTheme();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modalOverlay }}
    >
      <div
        className="max-w-sm w-full rounded p-6 shadow-lg"
        style={{ background: t.modalBg, color: t.textPrimary }}
      >
        <h3 id="unsaved-title" className="text-lg font-semibold mb-2">
          Modifiche non salvate
        </h3>
        <p className="text-sm mb-4">
          Ci sono modifiche non salvate. Vuoi scartarle e continuare?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 border rounded"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          >
            Scarta e continua
          </button>
        </div>
      </div>
    </div>
  );
}
