// ============================================================
// Selectors — pure read-only projections of AppState.
// Kept minimal per Changelog §13/D (scope 5b). More will be added
// in Sessione 7 (vista Oggi) as the UI reveals concrete needs.
// ============================================================
//
// Purity: selectors never call `new Date()` internally. The
// current time is passed in as a parameter (defaulted to
// `new Date()` for convenience). This keeps tests deterministic
// and prepares the ground for Sessione 6's `useNow` hook.

/** Format a Date as 'YYYY-MM-DD' in local time. */
function formatISODate(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dd}`;
}

/** Format a Date as 'HH:MM' in local time. */
function formatHHMM(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Convert 'HH:MM' to minutes-from-midnight. */
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Today's date as 'YYYY-MM-DD'. Independent of `simulatedNow`:
 * the simulator shifts the clock within a day, not the calendar.
 * @param {import('./reducer.js').AppState} _state
 * @param {Date} [now]
 * @returns {string}
 */
export function selectToday(_state, now = new Date()) {
  return formatISODate(now);
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
 * Next due dose for today: first entry with stato in {'prevista','ricalcolata'}
 * whose effective scheduled time (ora_ricalcolata ?? ora_prevista) is >= current HH:MM.
 * If none (all past or none remaining), returns null.
 * Current time: `state.simulatedNow` in DEV, else derived from `now`.
 * @param {import('./reducer.js').AppState} state
 * @param {Date} [now]
 * @returns {import('../domain/types.js').PlanEntry|null}
 */
export function selectProssimaDose(state, now = new Date()) {
  const today = formatISODate(now);
  const nowHHMM = state.simulatedNow ?? formatHHMM(now);
  const nowMin = hhmmToMinutes(nowHHMM);

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
