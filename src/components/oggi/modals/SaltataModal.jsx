// ============================================================
// SaltataModal — correction sheet for a dose already in stato 'saltata'.
//
// Opens from tapping the SALTATA label in the time column of a DoseCard.
// Offers three actions:
//   1. Confermo saltata   → pure onClose (no-op dispatch)
//   2. Cambia in sospesa  → thunk `ripristina(entryKey, 'sospesa')`
//   3. L'ho presa alle... → time picker submode → thunk
//        `presa(entryKey, { dataEffettiva: entry.dateStr, oraEffettiva: customTime })`
//
// Note on "Correggi a presa" semantics (CP0 / AMB-7c-1.M): `applyAssunzione`
// has NO guard on `target.stato`, so calling presa() on a 'saltata' entry
// works out of the box. §6.36 was not consumed.
//
// Note on "Cambia in sospesa": uses `ripristina(entryKey, 'sospesa')`, not
// `sospendi(entryKey)`. applyRipristino is the domain primitive for
// switching saltata↔sospesa; applySospensione requires a pending state.
//
// 1:1 port of `SaltataCorrectModal` from pharmatimer_oggi_v5.jsx
// (lines 737-800), renamed per AMB-7c-1.C, with AMB-7c-1.I cross-day
// hint above the time picker.
//
// Q1 resolved: the "Confermo saltata" button IS retained (porting fedele,
// bottom-sheet mobile affordance, zero-cost onClose).
//
// 7d-1 update (AMB-7d-1.C/D/F/J): a11y via `useModalA11y`. See AltroModal
// header for the pattern rationale.
//
// AMB-7c-1.C / AMB-7c-1.E / AMB-7c-1.I / AMB-7d-1.C-F / Changelog §11.
// ============================================================

import { useState } from 'react';
import { useTheme } from '../../../hooks/useTheme.js';
import { useModalA11y } from '../../../hooks/useModalA11y.js';
import { IconX, IconClock, IconPause } from '../../shared/Icons.jsx';
import { crossDayHint } from './_crossDayHint.js';

const LABEL_ID = 'saltata-modal-title';

/**
 * @param {{
 *   entry: import('../../../domain/types.js').PlanEntry | null,
 *   todayStr: string,
 *   onCambiaInSospesa: (entry: import('../../../domain/types.js').PlanEntry) => void,
 *   onSetTime: (entry: import('../../../domain/types.js').PlanEntry, hhmm: string) => void,
 *   onClose: () => void,
 *   triggerRef?: { current: HTMLElement | null } | null,
 * }} props
 */
export function SaltataModal({
  entry,
  todayStr,
  onCambiaInSospesa,
  onSetTime,
  onClose,
  triggerRef = null,
}) {
  const { tokens: t } = useTheme();
  const initialTime = entry?.ora_ricalcolata || entry?.ora_prevista || '08:00';
  const [mode, setMode] = useState('choose');
  const [customTime, setCustomTime] = useState(initialTime);

  const { containerRef, modalProps } = useModalA11y({
    isOpen: !!entry,
    onClose,
    labelId: LABEL_ID,
    triggerRef,
  });

  if (!entry) return null;
  const f = entry.farmaco;
  const hint = crossDayHint(entry.dateStr, todayStr);

  return (
    <div
      data-testid="saltata-modal"
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
          Dose prevista alle {entry.ora_ricalcolata || entry.ora_prevista}, marcata come saltata.
        </p>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: t.grayBg, color: t.textSecondary, border: `1px solid ${t.headerBorder}` }}
            >
              <IconX color={t.textSecondary} size={16} />
              Confermo saltata
            </button>

            <button
              type="button"
              onClick={() => { onCambiaInSospesa(entry); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: t.sospesaBg, color: t.sospesaTx, border: `1px solid ${t.sospesaBd}` }}
            >
              <IconPause color={t.sospesaTx} />
              Cambia in sospesa
            </button>

            <button
              type="button"
              onClick={() => setMode('timepick')}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: t.blueBg, color: t.blueTx, border: `1px solid ${t.blueBd}` }}
            >
              <IconClock color={t.blueTx} />
              L'ho presa alle...
            </button>
          </div>
        ) : (
          <div>
            {hint && (
              <p
                className="text-xs mb-2 text-center"
                style={{ color: t.warnTx }}
                data-testid="cross-day-hint"
              >
                {hint}
              </p>
            )}
            <div
              className="flex items-center justify-center gap-4 mb-5 py-4 rounded-xl"
              style={{ background: t.grayBg }}
            >
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                aria-label="Orario di assunzione"
                className="text-3xl font-bold text-center bg-transparent border-none outline-none"
                style={{ color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: t.grayBg, color: t.textSecondary }}
              >
                Indietro
              </button>
              <button
                type="button"
                onClick={() => { onSetTime(entry, customTime); onClose(); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: t.blue, color: '#FFF' }}
              >
                Registra assunzione
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
