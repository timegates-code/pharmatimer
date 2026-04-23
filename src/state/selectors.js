// ============================================================
// Selectors — pure read-only projections of AppState.
// Kept minimal per Changelog §13/D (scope 5b). More are added on demand.
// Sessione 7a (§6.27): `selectImpostazione` exposes the generic
// `state.impostazioni` dict introduced with AMB-7a.M.
// Sessione 7b-1 (AMB-7b.F): `selectCountersForDay` computes the header
// counters for a given day with TOLLERANZA_MIN-aware "in ritardo" logic
// (Changelog §6.9 bugfix versus the mockup's `diff < 0`).
// Sessione 7b-2 (AMB-7b-2.A): `selectUltimaPresa` surfaces the top of
// `state.presoStack` for the UNDO-eligibility check in OggiView.
// Sessione 7c-1 (AMB-7c-1.J): `selectEntryByKey` added as a pure lookup
// helper. Preparatory for 7c-2 auto-prompt hydration, but also useful
// to modals that need fresh entry data post-dispatch. Not used by the
// 4 tap-driven modals of 7c-1 themselves (they receive `entry` via
// props); keeping it here contains the surface area of 7c-2.
// Sessione 7c-2 (AMB-7c-2.H): `selectPromptEntry` hydrates the entry
// pointed to by `state.prompt.entryKey`, composing `selectEntryByKey`.
// Consumed by OggiView's auto-prompt useEffect to open RecuperoModal
// with source='auto' when the domain raises a 'gap_recovery' prompt.
// ============================================================
//
// Purity: selectors never call `new Date()` internally for clock
// resolution — they delegate to `utils/now.resolveNow`, which accepts
// a `referenceDate` defaulted to `new Date()`. Tests can inject a
// deterministic referenceDate; the `useNow` hook invokes selectors
// with the tick-driven reference.

import { resolveNow } from '../utils/now.js';
import { TOLLERANZA_MIN } from '../domain/constants.js';

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

/**
 * Aggregate counters for the Oggi header, computed for a given `dateStr`
 * relative to a given `now`.
 *
 * Returned shape:
 *   {
 *     presi:      number,          // count of stato === 'presa'
 *     saltate:    number,          // count of stato === 'saltata'
 *     sospese:    number,          // count of stato === 'sospesa'
 *     inRitardo:  number,          // pending entries past TOLLERANZA_MIN
 *     prossimoIn: number | null,   // minutes to the next pending dose ≥ now
 *     restanti:   number,          // pending entries NOT in ritardo
 *   }
 *
 * Rules (align with Spec §5.3 / §5.5 and getCardState):
 *   - "pending" := stato ∈ {'prevista', 'ricalcolata'}
 *   - An entry is "in ritardo" only when
 *         doseMin < nowMin - TOLLERANZA_MIN
 *     i.e. strictly past the tolerance window. At exactly -15 min it is still
 *     "prossima" (boundary inclusive), mirroring getCardState. This is the
 *     Changelog §6.9 / AMB-7b.F bugfix against the mockup's `doseMin < nowMin`.
 *   - `restanti = pending − inRitardo` (invariant: pending = inRitardo + restanti).
 *   - `prossimoIn` considers pending entries whose effective time ≥ nowMin,
 *     sorted ASC; returns the diff in minutes for the earliest one, or null
 *     if none.
 *
 * Other-day behaviour: when `dateStr !== resolvedNow.dateStr`, the temporal
 * concepts "in ritardo" and "prossimoIn" do not apply (a dose at 09:00
 * yesterday is not an alert today; the comparison is HH:MM only and would be
 * misleading across days). In that case the selector returns
 * `inRitardo = 0`, `prossimoIn = null`, and `restanti = pending.length`.
 * Historical counters (presi/saltate/sospese) are always computed from the
 * day's own entries regardless.
 *
 * Purity: `resolveNow(state, now)` is used to honour `state.simulatedNow`
 * uniformly with selectProssimaDose / thunks.
 *
 * @param {import('./reducer.js').AppState} state
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {Date} [now]
 * @returns {{
 *   presi: number,
 *   saltate: number,
 *   sospese: number,
 *   inRitardo: number,
 *   prossimoIn: number | null,
 *   restanti: number,
 * }}
 */
export function selectCountersForDay(state, dateStr, now = new Date()) {
  const { dateStr: todayStr, minutes: nowMin } = resolveNow(state, now);
  const isToday = dateStr === todayStr;

  const dayEntries = state.plan.filter(e => e.dateStr === dateStr);

  const presi = dayEntries.filter(e => e.stato === 'presa').length;
  const saltate = dayEntries.filter(e => e.stato === 'saltata').length;
  const sospese = dayEntries.filter(e => e.stato === 'sospesa').length;

  const pending = dayEntries.filter(
    e => e.stato === 'prevista' || e.stato === 'ricalcolata'
  );

  // Default (non-today) behaviour: no temporal classification.
  let inRitardo = 0;
  let restanti = pending.length;
  let prossimoIn = null;

  if (isToday) {
    inRitardo = pending.filter(e => {
      const m = hhmmToMinutes(e.ora_ricalcolata ?? e.ora_prevista);
      return m < nowMin - TOLLERANZA_MIN;
    }).length;
    restanti = pending.length - inRitardo;

    const future = pending
      .map(e => ({ entry: e, min: hhmmToMinutes(e.ora_ricalcolata ?? e.ora_prevista) }))
      .filter(x => x.min >= nowMin)
      .sort((a, b) => a.min - b.min);
    prossimoIn = future.length > 0 ? future[0].min - nowMin : null;
  }

  return { presi, saltate, sospese, inRitardo, prossimoIn, restanti };
}

/**
 * Return the top of `state.presoStack` (most recent 'presa' eligible for
 * UNDO), or null if the stack is empty.
 *
 * Pure: no dependency on resolveNow / clock. The selector is consumed by
 * OggiView (7b-2) to compute `isLastPreso` for each DoseCard: the one
 * whose `entry.key` matches this return value is the only Card whose
 * check ✓ button is interactive. All others render the non-pulsing,
 * non-clickable check variant.
 *
 * AMB-7b-2.A / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {string | null}
 */
export function selectUltimaPresa(state) {
  const stack = state.presoStack;
  if (!stack || stack.length === 0) return null;
  return stack[stack.length - 1];
}

/**
 * Return the plan entry matching `entryKey`, or null if none is found.
 *
 * Pure helper. Preparatory for 7c-2 auto-prompt hydration (the prompt in
 * state.prompt stores an `entryKey`; consumers need to hydrate the full
 * entry before rendering). The 4 tap-driven modals of 7c-1 do not use
 * this selector — they receive `entry` directly via props from DoseCard
 * — but introducing it here keeps the 7c-2 surface minimal.
 *
 * AMB-7c-1.J / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @param {string} entryKey
 * @returns {import('../domain/types.js').PlanEntry | null}
 */
export function selectEntryByKey(state, entryKey) {
  if (!state.plan || !entryKey) return null;
  return state.plan.find(e => e.key === entryKey) ?? null;
}

/**
 * Return the plan entry pointed to by `state.prompt.entryKey`, or null
 * when no prompt is pending or the pointed entry is not in the plan.
 *
 * Composition of AMB-7c-2.H:
 *   - `state.prompt?.entryKey` gates the lookup (null/undefined/'' → null)
 *   - `selectEntryByKey` resolves the entry; its own miss-returns-null
 *     behaviour provides robustness against stale entryKey pointers
 *     (entry removed from plan between domain emission and UI consumption).
 *
 * Consumed by OggiView's auto-prompt useEffect (7c-2) to hydrate
 * `recuperoModal.entry` when a 'gap_recovery' prompt is raised by the
 * domain. Returning null is a safe no-op: the caller simply does not
 * open the modal.
 *
 * Not specific to kind='gap_recovery' — future prompt kinds can reuse
 * this selector for entry hydration. The kind discriminant lives in the
 * consumer's guard, not here.
 *
 * AMB-7c-2.H / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {import('../domain/types.js').PlanEntry | null}
 */
export function selectPromptEntry(state) {
  const entryKey = state.prompt?.entryKey;
  if (!entryKey) return null;
  return selectEntryByKey(state, entryKey);
}

/**
 * Return the full list of profili (ordered by id as returned by repo).
 *
 * AMB-8b.K / Sessione 8b / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {import('../domain/types.js').Profilo[]}
 */
export function selectProfili(state) {
  return state.profili;
}

/**
 * Return the currently active profilo, or null if none is set.
 *
 * AMB-8b.K / Sessione 8b / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {import('../domain/types.js').Profilo | null}
 */
export function selectProfiloAttivo(state) {
  return state.profiloAttivo;
}

/**
 * Lookup a profilo by id. Returns null if not found (never undefined).
 *
 * AMB-8b.K / Sessione 8b / Changelog §11.
 *
 * @param {import('./reducer.js').AppState} state
 * @param {number} id
 * @returns {import('../domain/types.js').Profilo | null}
 */
export function selectProfiloById(state, id) {
  return state.profili.find((p) => p.id === id) ?? null;
}
