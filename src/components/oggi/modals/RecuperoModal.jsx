// ============================================================
// RecuperoModal — gap-recovery slider for a dose in stato 'ricalcolata'
// with gap_minuti > 0.
//
// Opens from tapping the GAP badge (clock + minutes chip) in the badge row
// of a DoseCard, OR auto-opens when a new gap prompt appears in state.
// Offers:
//   - Slider (step=5 min) bound to [0, calcolaRecuperoMax(farmaco, gap)]
//   - "Anticipa di HH:MM" primary action → thunk `recupero(entryKey, rec)`
//   - "Ripristina" action (visible only when `entry.recupero_minuti > 0`)
//     → thunk `recupero(entryKey, 0)` via onReset. Rationale (Q3):
//     applyRecupero(entryKey, 0) resets ora_ricalcolata back to
//     ora_ricalcolata_originale and clears recupero_minuti. Verified
//     in CP0: no new thunk required, "NO modifications to actions.js"
//     rule respected.
//
// Slider upper bound comes from `calcolaRecuperoMax(farmaco, gap_minuti)`
// per AMB-7c-1.G. Single source of truth (domain §6.13): the formula
// mirrors the v5 mockup's `safetyMax` with the additional short-circuit
// `gap <= 0 → 0`.
//
// No time picker → no cross-day hint (AMB-7c-1.I applies only to modals
// that register an assumption with dataEffettiva/oraEffettiva). The
// recupero thunk does not consume a dataEffettiva.
//
// 1:1 port of `RitardoModal` from pharmatimer_oggi_v5.jsx (lines 648-734),
// renamed per AMB-7c-1.C.
//
// 7d-1 update (AMB-7d-1.C/D/F/J): a11y via `useModalA11y`. In addition to
// the manual `triggerRef` path (tap on gap badge), RecuperoModal supports
// auto-open (see §6.48 ephemeral prompt) — for those cases OggiView does
// NOT pass a `triggerRef`, and the hook falls back to
// `[data-entry-key="<fallbackEntryKey>"]` then `document.body` at close.
//
// AMB-7c-1.C / AMB-7c-1.G / Q3 resolution / AMB-7d-1.C-F / Changelog §11.
// ============================================================

import { useState } from 'react';
import { useTheme } from '../../../hooks/useTheme.js';
import { useModalA11y } from '../../../hooks/useModalA11y.js';
import { IconX } from '../../shared/Icons.jsx';
import { timeToMinutes, minutesToTime, formatDuration } from '../../../utils/time.js';
import { calcolaRecuperoMax } from '../../../domain/recalc.js';

const LABEL_ID = 'recupero-modal-title';

/**
 * @param {{
 *   entry: import('../../../domain/types.js').PlanEntry | null,
 *   onApply: (entry: import('../../../domain/types.js').PlanEntry, recuperoMinuti: number) => void,
 *   onReset: (entry: import('../../../domain/types.js').PlanEntry) => void,
 *   onClose: () => void,
 *   triggerRef?: { current: HTMLElement | null } | null,
 *   fallbackEntryKey?: string | null,
 * }} props
 */
export function RecuperoModal({
  entry,
  onApply,
  onReset,
  onClose,
  triggerRef = null,
  fallbackEntryKey = null,
}) {
  const { tokens: t } = useTheme();
  const [rec, setRec] = useState(entry?.recupero_minuti || 0);

  const { containerRef, modalProps } = useModalA11y({
    isOpen: !!entry,
    onClose,
    labelId: LABEL_ID,
    triggerRef,
    fallbackEntryKey,
  });

  if (!entry) return null;

  const f = entry.farmaco;
  const gap = entry.gap_minuti;
  const safetyMax = calcolaRecuperoMax(f, gap);

  const baseT = entry.ora_ricalcolata_originale || entry.ora_ricalcolata || entry.ora_prevista;
  const newT = minutesToTime(timeToMinutes(baseT) - rec);
  const pct = safetyMax > 0 ? (rec / safetyMax) * 100 : 0;
  const residualGap = gap - rec;
  const hasExisting = entry.recupero_minuti > 0;
  const primaryDisabled = rec === 0 && !hasExisting;

  return (
    <div
      data-testid="recupero-modal"
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
            Recupero ritardo
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

        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: t.modalAlertBg, border: `1px solid ${t.modalAlertBd}` }}
        >
          <p className="text-sm font-medium" style={{ color: t.modalAlertTx }}>{f.nome}</p>
          <p className="text-xs mt-0.5" style={{ color: t.modalAlertSub }}>
            Ritardo accumulato: {formatDuration(gap)}
          </p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: t.textSecondary }}>
              Tempo da recuperare
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: t.textPrimary }}
              data-testid="rec-value"
            >
              {formatDuration(rec)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={safetyMax}
            step="5"
            value={rec}
            onChange={(e) => setRec(Number(e.target.value))}
            aria-label="Minuti da recuperare"
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${t.sliderFill} ${pct}%, ${t.sliderTrack} ${pct}%)`,
            }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: t.textMuted }}>
            <span>0</span>
            <span>max {formatDuration(safetyMax)}</span>
          </div>
        </div>

        <div
          className="rounded-xl p-3 mb-3"
          style={{ background: t.infoBg, border: `1px solid ${t.infoBd}` }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: t.infoTx }}>Orario attuale</span>
            <span className="text-sm font-medium" style={{ color: t.infoTxBold }}>{baseT}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-semibold" style={{ color: t.infoTx }}>Nuovo orario</span>
            <span
              className="text-sm font-bold"
              style={{ color: t.infoTxBold }}
              data-testid="new-time"
            >
              {newT}
            </span>
          </div>
        </div>

        <div
          className="rounded-xl p-3 mb-5"
          style={{
            background: residualGap > 0 ? t.modalAlertBg : t.greenBg,
            border: `1px solid ${residualGap > 0 ? t.modalAlertBd : t.checkBd}`,
          }}
        >
          <div className="flex justify-between items-center">
            <span
              className="text-xs font-semibold"
              style={{ color: residualGap > 0 ? t.modalAlertTx : t.greenTx }}
            >
              Ritardo residuo
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: residualGap > 0 ? t.modalAlertSub : t.greenTx }}
            >
              {residualGap > 0 ? formatDuration(residualGap) : '0 — riallineato'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {hasExisting && (
            <button
              type="button"
              onClick={() => { onReset(entry); onClose(); }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: t.grayBg,
                color: t.textSecondary,
                border: `1px solid ${t.headerBorder}`,
              }}
            >
              Ripristina
            </button>
          )}
          <button
            type="button"
            onClick={() => { onApply(entry, rec); onClose(); }}
            disabled={primaryDisabled}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              background: rec > 0 ? t.blue : t.btnDisabledBg,
              color: rec > 0 ? '#FFF' : t.btnDisabledTx,
              cursor: rec > 0 ? 'pointer' : 'default',
            }}
          >
            {rec > 0 ? `Anticipa di ${formatDuration(rec)}` : 'Seleziona tempo'}
          </button>
        </div>
      </div>
    </div>
  );
}
