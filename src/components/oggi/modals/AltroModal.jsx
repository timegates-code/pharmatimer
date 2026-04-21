// ============================================================
// AltroModal — "Altro" action sheet for a pending dose.
//
// Opens from the ALTRO pill on a DoseCard in state 'prevista' | 'ricalcolata'.
// Offers three actions:
//   1. Saltata   → thunk `salta(entryKey)` (no override)
//   2. Sospesa   → thunk `sospendi(entryKey)`
//   3. L'ho presa alle...  → time picker submode → thunk
//        `presa(entryKey, { dataEffettiva: entry.dateStr, oraEffettiva: customTime })`
//
// 1:1 port of `AltroModal` from pharmatimer_oggi_v5.jsx (lines 570-645),
// femminine rename (isPreso→isPresa dropped here: not applicable) plus
// AMB-7c-1.I cross-day hint above the time picker.
//
// Theme source: useTheme() from AppContext (AMB-7a.C), NOT a prop.
// Close pattern: overlay-click (outer div onClick where target===currentTarget)
// + explicit close button in the header.
//
// 7d-1 update (AMB-7d-1.C/D/F/J): a11y via `useModalA11y` — focus trap on
// mount, Escape-to-close, restore focus to `triggerRef.current` at deactivate.
// `role="dialog"` + `aria-modal="true"` + `aria-labelledby` applied to the
// sheet (inner container) via `modalProps`. Overlay div no longer carries
// role/aria-label. New optional `triggerRef` prop captured by OggiView.
//
// AMB-7c-1.C / AMB-7c-1.D / AMB-7c-1.I / AMB-7d-1.C-F / Changelog §11.
// ============================================================

import { useState } from 'react';
import { useTheme } from '../../../hooks/useTheme.js';
import { useModalA11y } from '../../../hooks/useModalA11y.js';
import { IconX, IconClock, IconPause } from '../../shared/Icons.jsx';
import { crossDayHint } from './_crossDayHint.js';

const LABEL_ID = 'altro-modal-title';

/**
 * @param {{
 *   entry: import('../../../domain/types.js').PlanEntry | null,
 *   todayStr: string,
 *   onSaltata: (entry: import('../../../domain/types.js').PlanEntry) => void,
 *   onSospesa: (entry: import('../../../domain/types.js').PlanEntry) => void,
 *   onSetTime: (entry: import('../../../domain/types.js').PlanEntry, hhmm: string) => void,
 *   onClose: () => void,
 *   triggerRef?: { current: HTMLElement | null } | null,
 * }} props
 */
export function AltroModal({
  entry,
  todayStr,
  onSaltata,
  onSospesa,
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
      data-testid="altro-modal"
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
          Dose prevista alle {entry.ora_ricalcolata || entry.ora_prevista}
        </p>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { onSaltata(entry); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-3 px-4"
              style={{ background: t.redBg, color: t.redTx, border: `1px solid ${t.red}30` }}
            >
              <IconX color={t.redTx} />
              <div className="text-left">
                <div>Saltata (dimenticata)</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">
                  {f.tipo_frequenza === 'intervallo'
                    ? 'Il ritardo si propaga alla dose successiva'
                    : 'La dose risulterà non assunta'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { onSospesa(entry); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-3 px-4"
              style={{ background: t.sospesaBg, color: t.textSecondary, border: `1px solid ${t.sospesaBd}` }}
            >
              <IconPause color={t.textSecondary} />
              <div className="text-left">
                <div>Sospesa (intenzionale)</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">
                  Nessun effetto sulle dosi successive
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('timepick')}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-3 px-4"
              style={{ background: t.blueBg, color: t.blueTx, border: `1px solid ${t.blueBd}` }}
            >
              <IconClock color={t.blueTx} />
              <div className="text-left">
                <div>L'ho presa alle...</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">
                  Registra un orario passato
                </div>
              </div>
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
