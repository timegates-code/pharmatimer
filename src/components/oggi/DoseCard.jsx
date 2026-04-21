// ============================================================
// DoseCard — single Plan entry renderer for vista Oggi.
//
// Sessione 7b-1 (AMB-7b.L): port of the v5 mockup `Card` (lines 365-565)
// in read-only form. PRESA / UNDO / ALTRO / saltata-sospesa editing / gap
// tap were all stripped.
//
// Sessione 7b-2 (AMB-7b-2.B / AMB-7b-2.C): ACTION AREA reintroduced for the
// two minimal gestures needed to take the view from read-only to functional:
//   - PRESA button for non-done states (prevista / ricalcolata / prossima /
//     in_attesa / in_ritardo), mounted only when `onPresa` is provided
//   - check ✓ button for stato === 'presa', clickable (dashed border + pulse
//     animation + UNDO overlay) iff `isLastPreso && onUndo`, otherwise rendered
//     as a disabled solid-border glyph
//
// Sessione 7c-1 (AMB-7c-1.L): four tap affordances added to open the modals
// wired in OggiView:
//   - ALTRO pill (next to PRESA) on non-done states, mounted only when
//     `onAltro` is provided
//   - SALTATA label in the TIME COLUMN becomes a <button> when `onSaltataTap`
//     is provided (dashed underline + IconEdit affordance, per v5)
//   - SOSPESA label analogously with `onSospesaTap`
//   - GAP badge in the badge row becomes a <TapBadge> (chevron, dashed) when
//     `onGapTap` is provided AND entry.gap_minuti > 0
// When the corresponding handler is NOT provided, the Card keeps the 7b-2
// non-interactive rendering (span / static Badge / no ALTRO).
//
// ACTION AREA re-activated for saltata/sospesa (7c-1): the red/gray circle
// on the right becomes a <button> with `onSaltataTap` / `onSospesaTap` as a
// redundant tap target (same modal opens from the time-column label — UX
// redundancy per mockup v5 lines 522-533).
//
// Sessione 7d-1 (AMB-7d-1.D/E):
//   - Root div receives `data-entry-key={entry.key}` (AMB-7d-1.E) so the
//     `useModalA11y` fallback chain can locate the originating card when
//     a modal closes without an explicit triggerRef (auto-open case).
//   - Root div also carries `tabIndex={-1}` so programmatic `.focus()`
//     from the hook's restore chain actually works on a plain `<div>`
//     (AMB-7d-1.D/E clarification, discovered in CP browser 5).
//   - §6.33 closed by REMOVAL rather than resize: IconUndo overlay
//     deleted. The dashed border + pulse animation + `aria-label=
//     "Annulla ultima presa"` already communicate the affordance
//     (visual + a11y). Scaling the overlay 10→14→18 proved the
//     overlay position was the wrong affordance anyway — removing it
//     reduces visual noise and keeps the check button clean.
//   - Every modal-opening handler (ALTRO, SALTATA label+circle, SOSPESA
//     label+circle, gap TapBadge) now forwards `e.currentTarget` as the
//     second argument so OggiView can capture the trigger element for
//     focus restore. Signature change is isolated to modal openers —
//     onPresa / onUndo retain the single-arg contract.
//
// Sessione 7d-2 CP5 (AMB-7d-2p2.D/H, §6.41):
//   - New optional prop `onUndoTap(entry, triggerEl)` opens UndoModal on
//     tap of the Card body when stato === 'presa'. When provided, the
//     TIME / SEPARATOR / CONTENT triplet is wrapped in a transparent
//     `<button>` sibling that does NOT include the ACTION AREA — the
//     dashed check ✓ keeps its own `onUndo` handler (UNDO direct via
//     stack, AMB-D). HTML-valid by construction: check button is a
//     sibling of the wrapper, not a descendant.
//   - Root `tabIndex={-1}` preserved (§6.54). The wrapper button is
//     keyboard-focusable on its own via Tab order.
//
// Sessione 7d-2 CP6 (AMB-7d-2p3.E/K'', §6.45 + §6.47a):
//   - §6.45: the isPresa branch now labels "in orario" whenever
//     |delta_minuti| ≤ TOLLERANZA_MIN (not just delta===0). Pre-CP6 an
//     anticipation of 1-15 min still rendered "Anticipo" while being
//     coloured green → mixed signal. Post-CP6 label and colour align.
//   - §6.47(a): the gap badge now consumes `gapResiduo = gap_minuti −
//     recupero_minuti` for both the mount guard (`hasGapTap`) and the
//     Badge/TapBadge label. When a recupero fully covers the gap the
//     badge unmounts; partial recupero leaves a reduced badge. Part (b)
//     of §6.47 (dashed-underline affordance on the residual badge) is
//     explicitly out of CP6 scope (prompt §11 v2.5.18).
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
//
// pulse-border keyframe:
//   The `pulse-border 2s infinite` animation on the check button is defined
//   in OggiView's inline <style> block (alongside scaduta-pulse and
//   flash-alert) so keyframes travel with their only consumer.
// ============================================================

import { useTheme } from '../../hooks/useTheme.js';
import { Badge } from '../shared/Badge.jsx';
import { TapBadge } from '../shared/TapBadge.jsx';
import { IconCheck, IconX, IconPause, IconEdit } from '../shared/Icons.jsx';
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
 *   onPresa?: (entry: import('../../domain/types.js').PlanEntry) => void,
 *   onUndo?:  (entry: import('../../domain/types.js').PlanEntry) => void,
 *   onUndoTap?: (entry: import('../../domain/types.js').PlanEntry, triggerEl: HTMLElement) => void,
 *   onAltro?: (entry: import('../../domain/types.js').PlanEntry, triggerEl: HTMLElement) => void,
 *   onSaltataTap?: (entry: import('../../domain/types.js').PlanEntry, triggerEl: HTMLElement) => void,
 *   onSospesaTap?: (entry: import('../../domain/types.js').PlanEntry, triggerEl: HTMLElement) => void,
 *   onGapTap?: (entry: import('../../domain/types.js').PlanEntry, triggerEl: HTMLElement | undefined) => void,
 *   isLastPreso?: boolean,
 * }} props
 *
 * All `on*` props are OPTIONAL by contract. Existing 7b-1 tests that render
 * DoseCard without any handler must keep passing. When a handler is absent,
 * the corresponding affordance is NOT mounted (no "ghost" button with a
 * detached onClick).
 */
export function DoseCard({
  entry,
  state,
  isFlashing = false,
  onPresa,
  onUndo,
  onUndoTap,
  onAltro,
  onSaltataTap,
  onSospesaTap,
  onGapTap,
  isLastPreso = false,
}) {
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
  // 7d-2 CP6 (§6.47a): gap residuo = gap_minuti − recupero_minuti. When a
  // RecuperoModal application partially (or fully) covers the gap, the badge
  // label reflects what's left. The `?? 0` fallbacks keep the expression
  // numeric even for plan entries shaped before the recupero_minuti column
  // existed (defensive — types.js always produces numbers).
  const gapResiduo = (entry.gap_minuti ?? 0) - (entry.recupero_minuti ?? 0);

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

  // ---------- action-area gating ----------

  // Undo is actually enabled only if BOTH conditions hold.
  const undoEnabled = isPresa && isLastPreso && typeof onUndo === 'function';
  // PRESA button shown only for non-done states AND only when onPresa is provided.
  const showPresaButton = !isDone && typeof onPresa === 'function';
  // ALTRO pill shown only for non-done states AND only when onAltro is provided (7c-1).
  const showAltroButton = !isDone && typeof onAltro === 'function';
  // Saltata / sospesa tap wiring (7c-1).
  const hasSaltataTap = typeof onSaltataTap === 'function';
  const hasSospesaTap = typeof onSospesaTap === 'function';
  // Gap tap wiring (7c-1 + 7d-2 CP6 §6.47a): mount only when a handler is
  // provided AND the residual gap (after any applied recupero) is positive.
  const hasGapTap = typeof onGapTap === 'function' && gapResiduo > 0;
  // 7d-2 CP5: Card body wrapper for isPresa state opens UndoModal.
  const undoTapEnabled = isPresa && typeof onUndoTap === 'function';

  // ---------- TIME / SEPARATOR / CONTENT extracted as JSX vars ----------
  // Extraction is necessary so the three blocks can be conditionally wrapped
  // in a `<button>` (7d-2 CP5) without duplicating markup per branch.

  const timeColumn = (
    <div className="flex-shrink-0 w-14 text-center">
      {isSaltata ? (
        <>
          <span
            className="text-sm font-bold block line-through"
            style={{ color: t.textMuted }}
          >
            {displayTime}
          </span>
          {hasSaltataTap ? (
            <button
              type="button"
              onClick={(e) => onSaltataTap(entry, e.currentTarget)}
              aria-label="Modifica dose saltata"
              className="inline-flex items-center gap-0.5 mt-0.5 cursor-pointer active:scale-95 transition-transform bg-transparent border-0 p-0"
              style={{ borderBottom: `1px dashed ${t.red}` }}
            >
              <span
                className="text-xs font-black uppercase tracking-wide"
                style={{ color: t.red }}
              >
                saltata
              </span>
              <IconEdit color={t.red} />
            </button>
          ) : (
            <span
              className="text-xs font-black uppercase tracking-wide block mt-0.5"
              style={{ color: t.red }}
            >
              saltata
            </span>
          )}
        </>
      ) : isSospesa ? (
        <>
          <span
            className="text-sm font-bold block line-through"
            style={{ color: t.textMuted }}
          >
            {displayTime}
          </span>
          {hasSospesaTap ? (
            <button
              type="button"
              onClick={(e) => onSospesaTap(entry, e.currentTarget)}
              aria-label="Modifica dose sospesa"
              className="inline-flex items-center gap-0.5 mt-0.5 cursor-pointer active:scale-95 transition-transform bg-transparent border-0 p-0"
              style={{ borderBottom: `1px dashed ${t.sospesaTx}` }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: t.sospesaTx }}
              >
                sospesa
              </span>
              <IconEdit color={t.sospesaTx} />
            </button>
          ) : (
            <span
              className="text-xs font-bold uppercase tracking-wide block mt-0.5"
              style={{ color: t.sospesaTx }}
            >
              sospesa
            </span>
          )}
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
            // 7d-2 CP6 (§6.45): "in orario" copre tutta la finestra di
            // tolleranza |delta| ≤ TOLLERANZA_MIN. Pre-CP6 solo delta===0
            // mostrava "in orario"; un anticipo di 1-15 min restava etichettato
            // "Anticipo" pur essendo già colorato verde → incoerenza UI.
            if (abs <= TOLLERANZA_MIN) {
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
  );

  const separator = (
    <div className="w-px self-stretch rounded" style={{ background: t.headerBorder }} />
  );

  const content = (
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
        {gapResiduo > 0 && !isDone && (
          hasGapTap ? (
            <TapBadge
              label={formatGapLabel(gapResiduo)}
              bg={t.gapBg}
              text={t.gapTx}
              border={t.gapTx}
              onClick={(e) => onGapTap(entry, e?.currentTarget)}
            />
          ) : (
            <Badge
              label={formatGapLabel(gapResiduo)}
              bg={t.gapBg}
              text={t.gapTx}
              border={t.gapBd}
            />
          )
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
  );

  // 7d-2 CP5: conditionally wrap TIME / SEP / CONTENT in a button.
  // The wrapper reproduces the parent flex layout (`flex items-center
  // gap-2 flex-1 min-w-0`) so the visual result is identical to the
  // non-wrapped branch. ACTION AREA remains a sibling of the wrapper,
  // avoiding nested <button> HTML invalidity.
  const body = undoTapEnabled ? (
    <button
      type="button"
      onClick={(e) => onUndoTap(entry, e.currentTarget)}
      aria-label="Annulla dose presa"
      className="flex items-center gap-2 flex-1 min-w-0 bg-transparent border-0 p-0 text-left cursor-pointer"
    >
      {timeColumn}
      {separator}
      {content}
    </button>
  ) : (
    <>
      {timeColumn}
      {separator}
      {content}
    </>
  );

  return (
    <div
      data-entry-key={entry.key}
      tabIndex={-1}
      className={`rounded-xl overflow-hidden transition-colors duration-200${
        isInRitardo ? ' animate-scaduta' : ''
      }${isFlashing ? ' animate-flash' : ''}`}
      style={{
        background: t.cardBg[state] || t.cardBg.in_attesa,
        borderTop: borderAll,
        borderRight: borderAll,
        borderBottom: borderAll,
        borderLeft,
        opacity: isSaltata || isSospesa ? 0.75 : 1,
      }}
    >
      <div className="flex items-center gap-2 p-3">
        {body}

        {/* ACTION AREA (sibling of body; never nested inside wrapper) */}
        {isPresa ? (
          <button
            type="button"
            onClick={undoEnabled ? () => onUndo(entry) : undefined}
            disabled={!undoEnabled}
            aria-label={undoEnabled ? 'Annulla ultima presa' : 'Dose presa'}
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 relative"
            style={{
              background: t.checkBg,
              border: isLastPreso
                ? `2px dashed ${t.checkBd}`
                : `2px solid ${t.checkBd}`,
              cursor: undoEnabled ? 'pointer' : 'default',
              animation: isLastPreso ? 'pulse-border 2s infinite' : 'none',
              boxShadow: isLastPreso ? t.tapShadow : 'none',
            }}
          >
            <IconCheck color={t.checkStroke} />
          </button>
        ) : isSaltata ? (
          hasSaltataTap ? (
            <button
              type="button"
              onClick={(e) => onSaltataTap(entry, e.currentTarget)}
              aria-label="Modifica dose saltata"
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              style={{
                background: t.redBg,
                border: `2px dashed ${t.red}60`,
                boxShadow: t.tapShadow,
              }}
            >
              <IconX color={t.red} />
            </button>
          ) : (
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: t.redBg,
                border: `2px dashed ${t.red}60`,
              }}
              aria-hidden="true"
            >
              <IconX color={t.red} />
            </div>
          )
        ) : isSospesa ? (
          hasSospesaTap ? (
            <button
              type="button"
              onClick={(e) => onSospesaTap(entry, e.currentTarget)}
              aria-label="Modifica dose sospesa"
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              style={{
                background: t.sospesaBg,
                border: `2px dashed ${t.sospesaBd}`,
                boxShadow: t.tapShadow,
              }}
            >
              <IconPause color={t.sospesaTx} />
            </button>
          ) : (
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: t.sospesaBg,
                border: `2px dashed ${t.sospesaBd}`,
              }}
              aria-hidden="true"
            >
              <IconPause color={t.sospesaTx} />
            </div>
          )
        ) : showPresaButton ? (
          <>
            {showAltroButton && (
              <>
                <button
                  type="button"
                  onClick={(e) => onAltro(entry, e.currentTarget)}
                  aria-label="Altre opzioni"
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: t.altroBg,
                    border: `2px solid ${t.altroBd}`,
                    cursor: 'pointer',
                    boxShadow: t.tapShadow,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: t.altroTx,
                      letterSpacing: '0.03em',
                      lineHeight: 1,
                    }}
                  >
                    ALTRO
                  </span>
                </button>
                <div
                  className="flex-shrink-0 w-px self-stretch rounded"
                  style={{ background: t.headerBorder }}
                />
              </>
            )}
            <button
              type="button"
              onClick={() => onPresa(entry)}
              aria-label="Registra dose presa"
              className="flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                width: 52,
                height: 52,
                background: t.btnCircleBg,
                border: `2px solid ${t.btnCircleBd}`,
                cursor: 'pointer',
                boxShadow: t.tapShadow,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: t.blue,
                  letterSpacing: '0.03em',
                  lineHeight: 1,
                }}
              >
                PRESA
              </span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default DoseCard;
