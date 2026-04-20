// ============================================================
// _crossDayHint — pure helper used by modals with a time picker to
// surface the date of the dose being registered when it is NOT today.
//
// AMB-7c-1.I: the time picker registers an assumption as
// `dataEffettiva = entry.dateStr`, `oraEffettiva = customTime`. When
// entry.dateStr is yesterday, the user should be told before tapping
// "Registra assunzione", otherwise the UI silently records the time on
// the wrong day. The rule:
//
//   entry.dateStr === todayStr      → null (no hint)
//   entry.dateStr === yesterdayStr  → "Ieri — DD/MM"
//   otherwise                       → "DD/MM/YYYY"
//
// The helper is prefixed with an underscore to signal module-internal
// usage (scope: src/components/oggi/modals/). AltroModal and SaltataModal
// import it; RecuperoModal does not (it has no time picker — its slider
// mutates recupero_minuti via applyRecupero which does not consume a
// dataEffettiva/oraEffettiva, so there is no day to disambiguate).
// ============================================================

import { addDays } from '../../../utils/time.js';

/**
 * @param {string} entryDateStr 'YYYY-MM-DD' (from entry.dateStr)
 * @param {string} todayStr     'YYYY-MM-DD' (from resolveNow / selectToday)
 * @returns {string | null}
 */
export function crossDayHint(entryDateStr, todayStr) {
  if (!entryDateStr || !todayStr) return null;
  if (entryDateStr === todayStr) return null;

  const yesterdayStr = addDays(todayStr, -1);
  const [yyyy, mm, dd] = entryDateStr.split('-');

  if (entryDateStr === yesterdayStr) {
    return `Ieri — ${dd}/${mm}`;
  }
  return `${dd}/${mm}/${yyyy}`;
}
