// ============================================================
// SospesaModal — restore sheet for a dose in stato 'sospesa'.
//
// Opens from tapping the SOSPESA label in the time column of a DoseCard.
// Offers ONE action per AMB-7c-1.F:
//   1. Ripristina  → thunk `ripristina(entryKey, 'attiva')` → stato becomes
//      'prevista' or 'ricalcolata' depending on whether ora_ricalcolata
//      is set (see applyRipristino in recalc.js).
//
// §6.37 (Q2): the v5 mockup's second action "Cambia in saltata" is NOT
// ported in 7c-1. `applyRipristino(to='saltata')` is not a valid target
// in the domain; replicating the UX via composed dispatches
// (ripristina→salta) would violate the "NO modifications to thunks"
// rule for this session. Deferred to 7d polish or Step 8.
//
// Naming kept "Ripristina come da prendere" from the v5 mockup to match
// the phrasing the user has seen in prior sessions.
//
// 1:1 port of `SospesaCorrectModal` from pharmatimer_oggi_v5.jsx
// (lines 803-832), renamed per AMB-7c-1.C. No time picker, so no
// cross-day hint needed.
//
// 7d-1 update (AMB-7d-1.C/D/F/J): a11y via `useModalA11y`. See AltroModal
// header for the pattern rationale.
//
// AMB-7c-1.C / AMB-7c-1.F / §6.37 / AMB-7d-1.C-F / Changelog §11.
// ============================================================

import { useTheme } from '../../../hooks/useTheme.js';
import { useModalA11y } from '../../../hooks/useModalA11y.js';
import { IconX, IconUndo } from '../../shared/Icons.jsx';

const LABEL_ID = 'sospesa-modal-title';

/**
 * @param {{
 *   entry: import('../../../domain/types.js').PlanEntry | null,
 *   onRipristina: (entry: import('../../../domain/types.js').PlanEntry) => void,
 *   onClose: () => void,
 *   triggerRef?: { current: HTMLElement | null } | null,
 * }} props
 */
export function SospesaModal({ entry, onRipristina, onClose, triggerRef = null }) {
  const { tokens: t } = useTheme();

  const { containerRef, modalProps } = useModalA11y({
    isOpen: !!entry,
    onClose,
    labelId: LABEL_ID,
    triggerRef,
  });

  if (!entry) return null;
  const f = entry.farmaco;

  return (
    <div
      data-testid="sospesa-modal"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: t.modalOverlay }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        className="w-full max-w-md rounded-t-2xl p-5 pb-8"
        style={{ background: t.modalBg }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id={LABEL_ID} className="font-bold text-base" style={{ color: t.textPrimary }}>
            {f.nome} — sospesa
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: t.modalCloseBtn }}
          >
            <IconX color={t.textSecondary} size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { onRipristina(entry); onClose(); }}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: t.blueBg, color: t.blueTx, border: `1px solid ${t.blueBd}` }}
          >
            <IconUndo color={t.blueTx} size={16} />
            Ripristina come da prendere
          </button>
        </div>
      </div>
    </div>
  );
}
