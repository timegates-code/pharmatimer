// ============================================================
// DoseCard — read-only rendering of a single Plan entry in vista Oggi.
//
// Sessione 7b-1 (AMB-7b.L): port of the v5 mockup `Card` (lines 365-565)
// stripped of every interactive affordance. The PRESA button, ALTRO button,
// UNDO button, SALTATA/SOSPESA edit affordances, and GAP tap are all out
// of scope: 7b-2 reintroduces PRESA + UNDO, 7c reintroduces the modals.
//
// Reads:
//   - Theme tokens via `useTheme()` (same pattern as NavBar / DevTimeSlider).
//   - Enum-aligned token keys from CP1 rename (§6.28): cardBg/cardBorder
//     now index as {presa, prossima, in_attesa, in_ritardo, saltata, sospesa}.
//
// Recalc diff (§6.11 / AMB-7b.L):
//   The mockup used a `±720 minutes` wrap-around. That masks a real bug
//   (§6.18) when an interval pushes a dose past midnight. We now compute
//   the diff via the DATETIME-based `calcolaDelta` from utils/time, and
//   we stamp the "effective" date as `addDays(entry.dateStr, 1)` only when
//   `isCrossMidnightRecalc(entry)` flags a backwards wrap. The domain fix
//   remains deferred to Step 9 (§6.26 workaround).
//
// Cross-midnight badge (§6.26 / AMB-7b.L):
//   When `isCrossMidnightRecalc(entry)` is true, the Card surfaces a
//   "⚠ orario: domani" badge next to the other info badges so the user
//   knows the recalculated time belongs to the following day even if the
//   entry.dateStr still references today.
// ============================================================

import { useTheme } from '../../hooks/useTheme.js';
import { Badge } from '../shared/Badge.jsx';
import { calcolaDelta, addDays } from '../../utils/time.js';
import { isCrossMidnightRecalc, formatDelta, formatGapLabel } from '../../utils/uiState.js';
import { TOLLERANZA_MIN } from '../../domain/constants.js';

// ---------- meal-relation helpers (1:1 port from v5 mockup) ----------

const PASTO_TX = {
  stomaco_pieno: { l: '#B91C1C', d: '#FCA5A5' },
  prima:         { l: '#92400E', d: '#FCD34D' },
  lontano:       { l: '#92400E', d: '#FCD34D' },
  durante:       { l: '#57534E', d: '#D6D3D1' },
  dopo:          { l: '#57534E', d: '#D6D3D1' },
  indifferente:  { l: '#6D28D9', d: '#C4B5FD' },
};

function getPastoColor(relazione, dk) {
  const c = PASTO_TX[relazione] || PASTO_TX.indifferente;
  return dk ? c.d : c.l;
}

function getPastoText(f) {
  if (f.relazione_pasto === 'indifferente') {
    return 'Assumere indifferentemente dai pasti';
  }
  if (f.dettaglio_pasto) {
    return `Assumere ${f.dettaglio_pasto}`;
  }
  const map = {
    prima: 'Assumere prima dei pasti',
    durante: 'Assumere durante i pasti',
    dopo: 'Assumere dopo i pasti',
    stomaco_pieno: 'Assumere a stomaco pieno',
    lontano: 'Assumere lontano dai pasti',
  };
  return map[f.relazione_pasto] || 'Assumere indifferentemente dai pasti';
}

// ---------- display helpers ----------

/**
 * Accept either 'HH:MM' or ISO datetime 'YYYY-MM-DDTHH:MM:SS' (per types.js).
 * Returns HH:MM for display.
 */
function extractHHMM(s) {
  if (!s) return '';
  const t = s.indexOf('T');
  return t >= 0 ? s.slice(t + 1, t + 6) : s.slice(0, 5);
}

/**
 * Mockup-exact formatter for the "Ritardo/Anticipo" value under ora_effettiva.
 * Narrow column = terse strings: "45 min", "1h 15", "2h". NOT the same as
 * formatDuration() from uiState.js (which always appends "min").
 */
function formatPresaValue(abs) {
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

// ---------- component ----------

/**
 * @param {{
 *   entry: import('../../domain/types.js').PlanEntry,
 *   state: 'presa'|'prossima'|'in_attesa'|'in_ritardo'|'saltata'|'sospesa',
 *   isFlashing?: boolean,
 * }} props
 */
export function DoseCard({ entry, state, isFlashing = false }) {
  const { dark, tokens: t } = useTheme();
  const f = entry.farmaco;

  const isPresa = entry.stato === 'presa';
  const isSaltata = entry.stato === 'saltata';
  const isSospesa = entry.stato === 'sospesa';
  const isDone = isPresa || isSaltata || isSospesa;
  const isInRitardo = state === 'in_ritardo';

  // Border styling per state (7a enum keys post-§6.28 rename).
  const borderLeft = state === 'in_attesa'
    ? 'none'
    : `3px solid ${t.cardBorder[state] || t.cardBorder.in_attesa}`;
  const borderAll = state === 'in_attesa'
    ? `1px solid ${t.cardBorder.in_attesa}`
    : '1px solid transparent';

  const doseLabel = f.dosi_giornaliere > 1 ? ` · ${entry.orario.dose_numero}ª dose` : '';
  const freqLabel = f.tipo_frequenza === 'intervallo' ? ` · ogni ${f.intervallo_ore}h` : '';
  const pastoColor = getPastoColor(f.relazione_pasto, dark);
  const displayTime = entry.ora_ricalcolata || entry.ora_prevista;

  // Recalculation diff via domain helper (§6.11). The wrap-around of the
  // mockup is replaced by an explicit date bump when §6.26 flags the bug.
  const isRecalc = !!entry.ora_ricalcolata;
  const isTimeDifferent = isRecalc && entry.ora_ricalcolata !== entry.ora_prevista;
  const crossMidnight = isCrossMidnightRecalc(entry);
  let recalcDiff = null;
  if (isTimeDifferent) {
    const dataEffettiva = crossMidnight ? addDays(entry.dateStr, 1) : entry.dateStr;
    recalcDiff = calcolaDelta({
      dataPrevista: entry.dateStr,
      oraPrevista: entry.ora_prevista,
      dataEffettiva,
      oraEffettiva: entry.ora_ricalcolata,
    });
  }

  return (
    <div
      className={`rounded-xl overflow-hidden transition-colors duration-200${
        isInRitardo ? ' animate-scaduta' : ''
      }${isFlashing ? ' animate-flash' : ''}`}
      style={{
        background: t.cardBg[state] || t.cardBg.in_attesa,
        // Use longhand properties for ALL four sides: mixing `border` shorthand
        // with `borderLeft` triggers a React warning on rerender (the library
        // can't guarantee the application order of shorthand vs longhand in
        // style objects). Same visual result, no warning.
        borderTop: borderAll,
        borderRight: borderAll,
        borderBottom: borderAll,
        borderLeft,
        opacity: isSaltata || isSospesa ? 0.75 : 1,
      }}
    >
      <div className="flex items-center gap-2 p-3">
        {/* TIME COLUMN */}
        <div className="flex-shrink-0 w-14 text-center">
          {isSaltata ? (
            <>
              <span
                className="text-sm font-bold block line-through"
                style={{ color: t.textMuted }}
              >
                {displayTime}
              </span>
              <span
                className="text-xs font-black uppercase tracking-wide block mt-0.5"
                style={{ color: t.red }}
              >
                saltata
              </span>
            </>
          ) : isSospesa ? (
            <>
              <span
                className="text-sm font-bold block line-through"
                style={{ color: t.textMuted }}
              >
                {displayTime}
              </span>
              <span
                className="text-xs font-bold uppercase tracking-wide block mt-0.5"
                style={{ color: t.sospesaTx }}
              >
                sospesa
              </span>
            </>
          ) : isPresa ? (
            <>
              <span
                className="text-base font-bold block"
                style={{ color: t.green, fontVariantNumeric: 'tabular-nums' }}
              >
                {extractHHMM(entry.ora_effettiva)}
              </span>
              {(() => {
                const delta = entry.delta_minuti ?? 0;
                const abs = Math.abs(delta);
                const color = abs <= TOLLERANZA_MIN ? t.green : t.red;
                if (delta === 0) {
                  return (
                    <span className="text-xs font-medium block" style={{ color }}>
                      in orario
                    </span>
                  );
                }
                const label = delta > 0 ? 'Ritardo' : 'Anticipo';
                return (
                  <>
                    <span
                      className="text-xs font-semibold block leading-tight"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs font-medium block leading-tight"
                      style={{ color, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatPresaValue(abs)}
                    </span>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <span
                className="text-base font-bold block"
                style={{ color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {displayTime}
              </span>
              {isTimeDifferent && (
                <span
                  className="text-sm block rounded px-1 py-px font-medium"
                  style={{
                    background: t.recalcOrigBg,
                    color: t.recalcOrigTx,
                    textDecoration: 'line-through',
                  }}
                >
                  {entry.ora_prevista}
                </span>
              )}
            </>
          )}
        </div>

        {/* SEPARATOR */}
        <div className="w-px self-stretch rounded" style={{ background: t.headerBorder }} />

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm"
            style={{ color: isDone && !isPresa ? t.textMuted : t.textCard }}
          >
            {f.nome}
          </p>
          <p className="text-xs" style={{ color: t.textCardSub }}>
            {f.funzione}
            {doseLabel}
            {freqLabel}
          </p>
          <p
            className="text-xs mb-1.5 font-medium"
            style={{ color: isDone && !isPresa ? t.textMuted : pastoColor }}
          >
            {getPastoText(f)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {isInRitardo && (
              <Badge
                label="⏰ IN RITARDO"
                bg={t.inRitardoBg}
                text={t.inRitardoTx}
                border={t.inRitardoBd}
              />
            )}
            {isTimeDifferent && !isDone && recalcDiff !== null && (
              <Badge
                label={formatDelta(recalcDiff)}
                bg={t.recalcBg}
                text={t.recalcTx}
                border={t.recalcBd}
              />
            )}
            {crossMidnight && !isDone && (
              <Badge
                label="⚠ orario: domani"
                bg={t.warnBg}
                text={t.warnTx}
                border={t.warnBd}
              />
            )}
            {entry.gap_minuti > 0 && !isDone && (
              <Badge
                label={formatGapLabel(entry.gap_minuti)}
                bg={t.gapBg}
                text={t.gapTx}
                border={t.gapBd}
              />
            )}
            {entry.dose_prec_saltata && !isDone && (
              <Badge
                label="⚠ dose prec. saltata"
                bg={t.warnBg}
                text={t.warnTx}
                border={t.warnBd}
              />
            )}
          </div>
          {f.note && !isDone && (
            <p className="text-xs mt-1 italic" style={{ color: t.textMuted }}>
              {f.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoseCard;
