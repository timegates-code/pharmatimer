import { useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';

// ============================================================
// UnsavedChangesModal — confirm dialog for dirty-state navigation.
// ============================================================
//
// 8d-B CP3 (§6.103 / AMB-8d-B.E): retrofit useModalA11y wiring on the
// 2nd consumer arrival (FarmacoDrawer close path guard, 8d-A-continue
// CP4 §6.98). The original 8a CP7 scope-minimal commit deferred this
// to "8d polish at 2nd consumer". Pattern is a 1:1 replica of the
// ConfirmModal shared (8c-2 CP5): focus-trap + Escape-to-close +
// restore-focus to triggerRef when provided.
//
// API props (8d-B CP3 onward):
//   open          boolean  — visibility gate (null-render when false).
//                            Migrated from conditional mount in callers
//                            for symmetry with ConfirmModal shared.
//   onCancel      () => void — also wired to Escape (via useModalA11y).
//   onDiscard     () => void — primary action (discard dirty state).
//   triggerRef    ref|null — 8d-B CP2 (§6.105) pattern: ref to the
//                            element that opened the modal. Forwarded
//                            to useModalA11y for restore-focus on
//                            dismiss. Optional; consumers without a
//                            stable trigger can omit (focus falls back
//                            to document.body).
// ============================================================

export default function UnsavedChangesModal({
  open,
  onCancel,
  onDiscard,
  triggerRef = null,
}) {
  const { tokens: t } = useTheme();
  const titleId = useId();

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
      data-testid="unsaved-changes-modal"
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
