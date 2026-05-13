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
// CP5 v3.0.0 Step 1 (§6.176/§6.179):
//   - `selectToast` exposes `state.toast` (CP5 §6.176 — Toast Mit-C).
//   - `selectDataInizioTerapia` derives min(farmaci_attivi.data_inizio)
//     for UI/debug (Q-S5=2). The actual plan-window filter lives in
//     planBuilder.isFarmacoActiveOn (already active since Step 4a),
//     so this selector is purely additive — see §6.179 rationale.
// ============================================================
//
// Purity: selectors never call `new Date()` internally for clock
// resolution — they delegate to `utils/now.resolveNow`, which accepts
// a `referenceDate` defaulted to `new Date()`. Tests can inject a
// deterministic referenceDate; the `useNow` hook invokes selectors
// with the tick-driven reference.

import { resolveNow } from '../utils/now.js';
import { TOLLERANZA_MIN } from '../domain/constants.js';
import {
  groupEntriesByDayAndMomento,
  formatDateLabel,
  getCardState,
  effHHMM,
  effectiveDateStr,
} from '../utils/uiState.js';
// CP10 v3.0.0 Step 2 (§6.188): selectProssimaDoseFuoriPlan dependencies.
import { computeOraPrevista } from '../domain/orarioResolver.js';
import {
  isExtendedInterval,
  computeExtendedOccurrencesInWindow,
} from '../domain/extendedFrequency.js';

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
 * Full farmaci list from state. Post-CP1 flip GET_FARMACI_SOLO_ATTIVI=true,
 * the array already contains only active farmaci (filtered at repo level).
 * Use this selector in Config/Oggi UI; `selectFarmaciAttivi` is retained for
 * defensive filtering when a stale cache might include `attivo=0` entries.
 * @param {import('./reducer.js').AppState} state
 * @returns {import('../domain/types.js').Farmaco[]}
 */
export function selectFarmaci(state) {
  return state.farmaci || [];
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
 * Lookup a farmaco by id. Returns null if not found (never undefined).
 *
 * Sessione 8c-2 CP5 / AMB-8c-2.C: signature aligned with selectProfiloById
 * `(state, id) => ...` for internal consistency. The §11 v2.5.28 prompt
 * sketched a curried form `(id) => (s) => ...`; the non-curried shape here
 * wins because every existing call-site reads selectors that way
 * (actions.js:514 `selectProfiloById(getState(), id)`).
 *
 * Defensive `state.farmaci || []` guards against very-early render paths
 * where the slice might not yet be initialised.
 *
 * @param {import('./reducer.js').AppState} state
 * @param {number} id
 * @returns {import('../domain/types.js').Farmaco | null}
 */
export function selectFarmacoById(state, id) {
  return (state.farmaci || []).find((f) => f.id === id) ?? null;
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
/**
 * §6.171 (CP3 v3.0.0 Step 1) — Preview giorno successivo (Q-UX.4).
 *
 * Returns the first day in `state.plan` strictly later than `today`
 * with at least one entry, grouped by momento via the existing
 * `groupEntriesByDayAndMomento` helper. Used by OggiView to render
 * the "PROSSIMA TERAPIA" preview when oggi is empty but at least
 * one farmaco is active.
 *
 * Trigger logic (par.6.171): plan-based instead of explicit
 * `data_inizio_terapia > today` (allocated to CP5). The two are
 * functionally equivalent for the first-day case (the only
 * scenario Q-UX.4 was designed for).
 *
 * @param {object} state    AppState root.
 * @param {string} today    'YYYY-MM-DD' date string for "today".
 * @returns {{dateStr:string, dateLabel:string, groups:Array}|null}
 */
export function selectProssimoGiornoConDosi(state, today) {
  const farmaciAttivi = (state.farmaci ?? []).filter((f) => f.attivo);
  if (farmaciAttivi.length === 0) return null;

  const futureEntries = (state.plan ?? []).filter((e) => e.dateStr > today);
  if (futureEntries.length === 0) return null;

  const grouped = groupEntriesByDayAndMomento(futureEntries);
  if (grouped.length === 0) return null;

  // Defensive sort: ensure the earliest day comes first.
  grouped.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const firstDay = grouped[0];

  return {
    dateStr: firstDay.dateStr,
    dateLabel: formatDateLabel(firstDay.dateStr, today),
    groups: firstDay.groups,
  };
}

// ============================================================
// CP5 v3.0.0 Step 1 (§6.176 + §6.179) — Toast + data_inizio_terapia.
// ============================================================

/**
 * §6.176 — Read the current ephemeral toast, or null if none is shown.
 *
 * Consumed by `<Toast />` in App.jsx to gate render + auto-dismiss
 * useEffect. Re-renders triggered by `state.toast.key` changing
 * (Date.now() at SHOW_TOAST dispatch) re-arm the 4-second timer
 * even when the message text is identical — see reducer §6.176.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {{key: number, message: string} | null}
 */
export function selectToast(state) {
  return state.toast ?? null;
}

/**
 * §6.179 — Earliest `data_inizio` among active farmaci, or null.
 *
 * Q-S5=2 ratification: `data_inizio_terapia` is computed dynamically
 * from `min(farmaci_attivi.data_inizio)` rather than being persisted
 * as a profilo field. The actual plan-window filter lives in
 * `planBuilder.isFarmacoActiveOn` (already active since Step 4a),
 * which guards each (farmaco × day) cell with
 * `farmaco.data_inizio > dateStr → skip`. This selector is purely
 * additive: UI/debug consumers can read the global "therapy start"
 * label, while the plan computation does not need it.
 *
 * Returns null when no active farmaci have a `data_inizio` (defensive
 * guard for migration users with NULL pre-CP2 records). Strings are
 * compared lexicographically — safe for ISO 'YYYY-MM-DD' format.
 *
 * @param {import('./reducer.js').AppState} state
 * @returns {string | null} 'YYYY-MM-DD' or null.
 */
export function selectDataInizioTerapia(state) {
  const dates = (state.farmaci ?? [])
    .filter((f) => f.attivo && typeof f.data_inizio === 'string' && f.data_inizio)
    .map((f) => f.data_inizio);
  if (dates.length === 0) return null;
  // Lexicographic min — valid for ISO 'YYYY-MM-DD'.
  let minDate = dates[0];
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] < minDate) minDate = dates[i];
  }
  return minDate;
}

// ============================================================
// CP10 v3.0.0 Step 2 (§6.188 + sub-AMB 13.d §22.43)
// — selectProssimaDoseFuoriPlan.
// ============================================================

/**
 * §6.188 — Q-UX.13 generalized selector. Returns the next future
 * occurrence "out of plan window" for any active farmaco, covering:
 *   - Standard `intervallo_ore <= 24h` with `data_inizio > today`
 *     (terapia rinviata)
 *   - Extended `intervallo_ore > 24h` with any data_inizio
 *     (off-day oggi: stride aritmetico cade fuori plan window)
 *
 * Generalizes the original §22.42 EXT.3'.a `selectProssimaDoseExtendedFuoriPlan`
 * to cover the misto case (sub-AMB 13.d §22.43): >=1 standard
 * `<=24h` con data_inizio > today + >=1 extended off-day oggi.
 *
 * Algorithm: per ogni farmaco attivo, compute next occurrence via
 * appropriate branch; sort cronologico (dateStr, oraPrevista,
 * farmaco.id); return primo. Edge cases:
 *   - 0 farmaci attivi -> null
 *   - state.profiloAttivo === null -> null (no oraPrevista computabile)
 *   - data_fine < today -> escluso
 *   - data_inizio === today -> escluso (already covered by plan if active today)
 *
 * Output shape:
 *   { dateStr: 'YYYY-MM-DD', oraPrevista: 'HH:MM', farmaco, orario }
 *
 * Consumer: OggiView Q-UX.13 empty state branch when
 * `groupedDays.length === 0 && selectProssimoGiornoConDosi() === null`.
 *
 * @param {object} state AppState root.
 * @param {string} today 'YYYY-MM-DD'.
 * @returns {{dateStr: string, oraPrevista: string, farmaco: object, orario: object} | null}
 */
export function selectProssimaDoseFuoriPlan(state, today) {
  const farmaciAttivi = (state.farmaci ?? []).filter((f) => f.attivo);
  if (farmaciAttivi.length === 0) return null;

  const profilo = state.profiloAttivo;
  if (!profilo) return null;

  const orariAll = state.orari ?? [];
  const candidates = [];

  for (const farmaco of farmaciAttivi) {
    if (farmaco.data_fine && farmaco.data_fine < today) continue;
    const orariFarmaco = orariAll.filter((o) => o.farmaco_id === farmaco.id);
    if (orariFarmaco.length === 0) continue;

    const occ = isExtendedInterval(farmaco)
      ? nextExtendedOccurrence(farmaco, orariFarmaco, profilo, today)
      : nextStandardOccurrence(farmaco, orariFarmaco, profilo, today);
    if (occ) {
      candidates.push({ ...occ, farmaco });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    if (a.oraPrevista !== b.oraPrevista) return a.oraPrevista.localeCompare(b.oraPrevista);
    return a.farmaco.id - b.farmaco.id;
  });

  return candidates[0];
}

/**
 * Standard branch (intervallo_ore <= 24 OR fisso): occurrence solo se
 * data_inizio strettamente futura. Primo orario cronologicamente.
 */
function nextStandardOccurrence(farmaco, orariFarmaco, profilo, today) {
  if (!farmaco.data_inizio) return null;
  if (farmaco.data_inizio <= today) return null; // === today: già nel plan
  const orariConOra = orariFarmaco.map((o) => ({
    orario: o,
    oraPrevista: computeOraPrevista(o, profilo),
  }));
  orariConOra.sort((a, b) => a.oraPrevista.localeCompare(b.oraPrevista));
  return {
    dateStr: farmaco.data_inizio,
    oraPrevista: orariConOra[0].oraPrevista,
    orario: orariConOra[0].orario,
  };
}

/**
 * Extended branch (intervallo_ore > 24): riusa
 * computeExtendedOccurrencesInWindow su window grande (365 giorni)
 * partendo da today, ritorna il primo strettamente > today.
 * Filtra eventuale occorrenza == today (gia' coperta dal plan se attiva).
 */
function nextExtendedOccurrence(farmaco, orariFarmaco, profilo, today) {
  const occ = computeExtendedOccurrencesInWindow(
    farmaco,
    orariFarmaco,
    profilo,
    today,
    365,
  );
  const future = occ.filter((o) => o.dateStr > today);
  if (future.length === 0) return null;
  return future[0];
}


// ============================================================
// Sessione 11 CP1 v3.0.1-rc.1 (§6.206 + §6.207)
// - selectAnchorEntry: priority-based scroll anchor for vista Oggi
//   (AMB-10.A÷E + 10.L: classification via getCardState runtime).
// - selectFarmaciConDataInizioFutura: grouped list of inactive-today
//   farmaci with future data_inizio for empty-state hint (AMB-10.F÷I).
// ============================================================

/**
 * §6.206 — Scroll-to-now anchor selector for vista Oggi.
 *
 * Returns the plan entry that should serve as the scroll anchor when
 * OggiView mounts / transitions to 'ready' / rolls over midnight
 * (AMB-10.B). Priority composite (AMB-10.A + 10.L: classification via
 * getCardState runtime, NOT entry.stato raw):
 *
 *   P1 — getCardState === 'in_ritardo' → max effHHMM (latest late)
 *   P2 — getCardState ∈ {'prossima', 'in_attesa'} → min effHHMM (soonest)
 *   P3 — none of the above → null (consumer scrolls to top, AMB-10.C)
 *
 * Pre-filter: entries are restricted to the current-day bucket via
 * effectiveDateStr(entry) === resolvedNow.dateStr. This honours the
 * visual bucketing of groupEntriesByDayAndMomento (11-B AMB-11.B.1):
 * cross-midnight recalc cards live in tomorrow's bucket and must NOT
 * anchor today's scroll.
 *
 * getCardState's own early returns for 'presa' / 'saltata' / 'sospesa'
 * naturally exclude closed entries from both P1 and P2.
 *
 * @param {import('./reducer.js').AppState} state
 * @param {Date} [now]
 * @returns {import('../domain/types.js').PlanEntry | null}
 */
export function selectAnchorEntry(state, now = new Date()) {
  const resolvedNow = resolveNow(state, now);
  const candidates = (state.plan ?? []).filter(
    (e) => effectiveDateStr(e) === resolvedNow.dateStr,
  );
  if (candidates.length === 0) return null;

  const annotated = candidates.map((entry) => ({
    entry,
    cardState: getCardState(entry, resolvedNow),
    effMinutes: hhmmToMinutes(effHHMM(entry)),
  }));

  // P1: in_ritardo → max effMinutes (most recent late, AMB-10.A)
  const inRitardo = annotated.filter((x) => x.cardState === 'in_ritardo');
  if (inRitardo.length > 0) {
    inRitardo.sort((a, b) => b.effMinutes - a.effMinutes);
    return inRitardo[0].entry;
  }

  // P2: prossima or in_attesa (pending future) → min effMinutes (soonest)
  const pendingFuture = annotated.filter(
    (x) => x.cardState === 'prossima' || x.cardState === 'in_attesa',
  );
  if (pendingFuture.length > 0) {
    pendingFuture.sort((a, b) => a.effMinutes - b.effMinutes);
    return pendingFuture[0].entry;
  }

  // P3: all closed (presa/saltata/sospesa) → null (AMB-10.C scroll-to-top)
  return null;
}

/**
 * §6.207 — Future therapy hint for empty-state Oggi.
 *
 * Returns active farmaci whose data_inizio is strictly in the future,
 * grouped by data_inizio (ASC), with each group's farmaci sorted by
 * nome (it-IT locale). Output shape:
 *
 *   [{ data_inizio: 'YYYY-MM-DD', farmaci: Farmaco[] }]
 *
 * Filter rules (parity with §6.188 selectProssimaDoseFuoriPlan):
 *   - f.attivo === true
 *   - typeof f.data_inizio === 'string' && f.data_inizio > today
 *     (strict greater: data_inizio === today is already covered by plan)
 *   - !f.data_fine || f.data_fine >= today
 *
 * Empty input or no matching farmaci → returns [] (consumer falls
 * back to the generic empty state, AMB-10.G).
 *
 * Distinct from selectProssimaDoseFuoriPlan (§6.188): that one is a
 * single-occurrence selector (any branch incl. extended); this one is
 * a grouped list (standard branch only) for visual cumulative hint.
 *
 * Consumer: OggiView NoDosesEmptyState sub-branch (CP3 §6.207).
 *
 * @param {import('./reducer.js').AppState} state
 * @param {string} today 'YYYY-MM-DD'
 * @returns {Array<{ data_inizio: string, farmaci: object[] }>}
 */
export function selectFarmaciConDataInizioFutura(state, today) {
  const farmaciFuturi = (state.farmaci ?? []).filter(
    (f) =>
      f.attivo &&
      typeof f.data_inizio === 'string' &&
      f.data_inizio > today &&
      (!f.data_fine || f.data_fine >= today),
  );
  if (farmaciFuturi.length === 0) return [];

  const byDate = new Map();
  for (const f of farmaciFuturi) {
    if (!byDate.has(f.data_inizio)) byDate.set(f.data_inizio, []);
    byDate.get(f.data_inizio).push(f);
  }

  const sortedKeys = [...byDate.keys()].sort();
  return sortedKeys.map((data_inizio) => ({
    data_inizio,
    farmaci: byDate
      .get(data_inizio)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
  }));
}
