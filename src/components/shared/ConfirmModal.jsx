// ============================================================
// ConfirmModal — shared confirm dialog (Sessione 8c-2 CP5 / §6.89, §6.92).
// ============================================================
//
// Promoted to a reusable component on the 2nd consumer (rettifica F3,
// §22.9 / §6.89): FarmaciTab uses it both for delete confirmation
// (copy §6.67) and for the data_fine-past pre-save interceptor
// (copy §6.68). A future retrofit (8d polish) will migrate
// ConfirmDeleteProfiloModal in ProfiliTab to this shared primitive.
//
// Asymmetry with predecessor (§6.92): this shared modal mounts
// `useModalA11y` (focus-trap + Escape-to-close + restore-focus),
// while the inline ConfirmDeleteProfiloModal in ProfiliTab was
// deliberately minimal (no focus-trap, "deferred to 8d polish").
// The asymmetry is transient; retrofit target is 8d alongside
// §6.89 migration.
//
// API props:
//   open          boolean  — visibility gate (null-render when false).
//   title         string   — heading, becomes aria-labelledby target.
//   body          ReactNode — main copy (can include <strong>, etc.).
//   confirmLabel  string   — primary button label (e.g. "Elimina").
//   cancelLabel   string   — secondary button label (default "Annulla").
//   danger        boolean  — if true, primary button in t.red (destructive).
//   onConfirm     () => void
//   onCancel      () => void — also wired to Escape (via useModalA11y).
//   triggerRef    ref|null — 8d-B CP2 (§6.105): ref to the element that
//                            opened the modal. Forwarded to useModalA11y
//                            for restore-focus on dismiss. Optional;
//                            consumers without a stable trigger can omit
//                            (focus falls back to document.body, the
//                            pre-§6.105 behaviour).
//
// No backdrop-click dismiss (buttons-only) — destructive/blocking flows
// require explicit user action. Z-index 60 to stack above the FarmacoDrawer
// (z-50) and the UnsavedChangesModal from ConfigView (z-50 equivalent).
// ============================================================

import { useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Annulla',
  danger = false,
  onConfirm,
  onCancel,
  triggerRef = null,
}) {
  const { tokens: t } = useTheme();
  const titleId = useId();

  // useModalA11y returns no-op refs when isOpen=false; we still null-render
  // below to avoid paying for the overlay DOM when closed.
  const { containerRef, modalProps } = useModalA11y({
    isOpen: open,
    onClose: onCancel,
    labelId: titleId,
    triggerRef,
  });

  if (!open) return null;

  return (
    <div
      role="presentation"
      data-testid="confirm-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: t.modalOverlay }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        className="max-w-sm w-full rounded p-6 shadow-lg"
        style={{ background: t.modalBg, color: t.textPrimary }}
      >
        <h3 id={titleId} className="text-lg font-semibold mb-2">
          {title}
        </h3>
        <div className="text-sm mb-4">
          {body}
        </div>
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
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border rounded font-semibold"
            style={{
              background: t.modalBg,
              color: danger ? t.red : t.blue,
              borderColor: danger ? t.red : t.blue,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
