// ============================================================
// Selectors — pure read-only projections of AppState.
// Kept minimal per Changelog §13/D (scope 5b). More are added on demand.
// Sessione 7a (§6.27): `selectImpostazione` exposes the generic
// `state.impostazioni` dict introduced with AMB-7a.M.
// ============================================================
//
// Purity: selectors never call `new Date()` internally for clock
// resolution — they delegate to `utils/now.resolveNow`, which accepts
// a `referenceDate` defaulted to `new Date()`. Tests can inject a
// deterministic referenceDate; the `useNow` hook invokes selectors
// with the tick-driven reference.

import { resolveNow } from '../utils/now.js';

/** Convert 'HH:MM' to minutes-from-midnight. */
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Today's date as 'YYYY-MM-DD' (local TZ). Independent of
 * `simulatedNow`: the simulator shifts the clock within a day,
 * not the calendar.
 * @param {import('./reducer.js').AppState} state
 * @param {Date} [now]
 * @returns {string}
 */
export function selectToday(state, now = new Date()) {
  return resolveNow(state, now).dateStr;
}

/**
 * All plan entries for a given day, preserving plan sort order.
 * @param {import('./reducer.js').AppState} state
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {import('../domain/types.js').PlanEntry[]}
 */
export function selectEntriesForDay(state, dateStr) {
  return state.plan.filter(e => e.dateStr === dateStr);
}

/**
 * Next due dose for today: first entry with stato in
 * {'prevista','ricalcolata'} whose effective scheduled time
 * (ora_ricalcolata ?? ora_prevista) is >= current HH:MM. If none
 * (all past or none remaining), returns null.
 * Current time is resolved via `resolveNow(state, now)` so that
 * `state.simulatedNow` is honoured uniformly with hook/thunks.
 * @param {import('./reducer.js').AppState} state
 * @param {Date} [now]
 * @returns {import('../domain/types.js').PlanEntry|null}
 */
export function selectProssimaDose(state, now = new Date()) {
  const { dateStr: today, minutes: nowMin } = resolveNow(state, now);

  const candidates = state.plan
    .filter(e =>
      e.dateStr === today &&
      (e.stato === 'prevista' || e.stato === 'ricalcolata')
    )
    .map(e => {
      const eff = e.ora_ricalcolata ?? e.ora_prevista;
      return { entry: e, min: hhmmToMinutes(eff) };
    })
    .filter(x => x.min >= nowMin)
    .sort((a, b) => a.min - b.min);

  return candidates.length > 0 ? candidates[0].entry : null;
}

/**
 * Active farmaci (attivo=1 or truthy).
 * @param {import('./reducer.js').AppState} state
 * @returns {import('../domain/types.js').Farmaco[]}
 */
export function selectFarmaciAttivi(state) {
  return state.farmaci.filter(f => f.attivo);
}

/**
 * True if an error is currently set on the state.
 * @param {import('./reducer.js').AppState} state
 * @returns {boolean}
 */
export function selectHasError(state) {
  return state.error !== null;
}

/**
 * Read a value from the generic `state.impostazioni` dict.
 * Returns `null` when the key is absent (never undefined).
 * AMB-7a.M / Changelog §6.27.
 * @param {import('./reducer.js').AppState} state
 * @param {string} chiave
 * @returns {any | null}
 */
export function selectImpostazione(state, chiave) {
  const v = state.impostazioni?.[chiave];
  return v === undefined ? null : v;
}
