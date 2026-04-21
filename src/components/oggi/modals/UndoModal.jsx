// ============================================================
// UndoModal — confirm dialog for undoing a specific "presa" dose.
//
// Opens from a tap on the Card body when the entry is in state 'presa'
// (DoseCard onUndoTap — Sessione 7d-2 CP5, AMB-7d-2p2.H).
//
// Behaviour (Sessione 7d-2 CP4/5, §6.41 + §6.61):
//   - Tap "Annulla assunzione" → onConfirm(entry) → thunk annullaAssunzione.
//     Thunk returns {ok: true} or {ok: false, code: '<DOMAIN_CODE>'}.
//   - ok=true  → onClose(): Card returns to 'prevista'/'ricalcolata', and
//                the entry key is removed from presoStack (reducer §6.62).
//   - ok=false, code='DOWNSTREAM_USER_EDITS' → render in-place banner
//     explaining that a later dose is blocking the undo. Modal stays open;
//     user can dismiss via X or overlay.
//   - ok=false, any other path (repo failure, unknown) → generic banner;
//     modal stays open; repo rollback already happened in commitApplyResult.
//
// Coexistence with UNDO direct (AMB-D):
//   - The check ✓ dashed-pulse button still invokes onUndo() → thunk
//     annullaUltima (stack-driven, top-only). That path lives on DoseCard
//     and does NOT open this modal. UndoModal is raggiunta only via the
//     Card body wrapper handler (onUndoTap).
//
// a11y (AMB-7d-1.C-F applied uniformly via useModalA11y):
//   - role='dialog' + aria-modal + aria-labelledby
//   - focus trap on mount, Escape-to-close, restore focus to triggerRef
//   - Initial focus lands on the first tabbable (header X), matching the
//     pattern of the 4 modals shipped in 7c-1 / 7d-1. The prompt §11
//     mention of "focus bottone Annulla" was reconciled against the
//     existing focus-trap behaviour (documented as D-R5 in §6).
//
// AMB-7d-2p2.H + §6.41 + §6.59.
// =============================================================

import { useState } from 'react';
import { useTheme } from '../../../hooks/useTheme.js';
import { useModalA11y } from '../../../hooks/useModalA11y.js';
import { IconX, IconUndo } from '../../shared/Icons.jsx';

const LABEL_ID = 'undo-modal-title';

/**
 * Format ora_effettiva (ISO 'YYYY-MM-DDTHH:MM:SS' or 'HH:MM') to 'HH:MM'.
 */
function extractHHMM(s) {
  if (!s) return '';
  const t = s.indexOf('T');
  return t >= 0 ? s.slice(t + 1, t + 6) : s.slice(0, 5);
}

/**
 * Format 'YYYY-MM-DD' to 'DD/MM'.
 */
function formatDayMonth(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

/**
 * @param {{
 *   entry: import('../../../domain/types.js').PlanEntry | null,
 *   onConfirm: (entry: import('../../../domain/types.js').PlanEntry) => Promise<{ok: boolean, code?: string}>,
 *   onClose: () => void,
 *   triggerRef?: { current: HTMLElement | null } | null,
 * }} props
 */
export function UndoModal({
  entry,
  onConfirm,
  onClose,
  triggerRef = null,
}) {
  const { tokens: t } = useTheme();
  const [errorCode, setErrorCode] = useState(null);
  const [busy, setBusy] = useState(false);

  const { containerRef, modalProps } = useModalA11y({
    isOpen: !!entry,
    onClose,
    labelId: LABEL_ID,
    triggerRef,
  });

  if (!entry) return null;
  const f = entry.farmaco;
  const hhmm = extractHHMM(entry.ora_effettiva);
  const dm = formatDayMonth(entry.dateStr);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    const result = await onConfirm(entry);
    setBusy(false);
    if (result?.ok) {
      onClose();
      return;
    }
    const code = result?.code;
    setErrorCode(code === 'DOWNSTREAM_USER_EDITS' ? 'DOWNSTREAM_USER_EDITS' : 'GENERIC');
  }

  return (
    <div
      data-testid="undo-modal"
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
            {f.nome}
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

        <p className="text-xs mb-4" style={{ color: t.textSecondary }}>
          Dose presa alle <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hhmm}</span> il {dm}
        </p>

        {errorCode === 'DOWNSTREAM_USER_EDITS' ? (
          <div
            role="alert"
            data-testid="undo-banner-downstream"
            className="w-full py-3 rounded-xl text-sm flex items-start gap-2 px-4"
            style={{
              background: t.modalAlertBg,
              color: t.modalAlertTx,
              border: `1px solid ${t.modalAlertBd}`,
            }}
          >
            <span aria-hidden="true">⚠</span>
            <div>
              <div className="font-semibold">Impossibile annullare</div>
              <div className="text-xs mt-0.5" style={{ color: t.modalAlertSub }}>
                Una dose successiva è già stata registrata o sospesa.
                Correggi prima quella.
              </div>
            </div>
          </div>
        ) : errorCode === 'GENERIC' ? (
          <div
            role="alert"
            data-testid="undo-banner-generic"
            className="w-full py-3 rounded-xl text-sm flex items-start gap-2 px-4"
            style={{
              background: t.modalAlertBg,
              color: t.modalAlertTx,
              border: `1px solid ${t.modalAlertBd}`,
            }}
          >
            <span aria-hidden="true">⚠</span>
            <div className="font-semibold">Errore durante l'annullamento</div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-3 px-4"
            style={{
              background: t.redBg,
              color: t.redTx,
              border: `1px solid ${t.red}30`,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            <IconUndo color={t.redTx} />
            <div className="text-left">
              <div>Annulla assunzione</div>
              <div className="text-xs font-normal opacity-70 mt-0.5">
                La dose tornerà in stato "prevista"
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export default UndoModal;
