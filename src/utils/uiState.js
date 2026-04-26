// ============================================================
// Pure UI-state helpers for vista Oggi.
//
// - `getCardState(entry, now)` – one of 6 visual states, derived from entry.stato
//   and the diff between `now` and the effective scheduled time
//   (ora_ricalcolata fallback ora_prevista). See Changelog §5.3 + §6.9.
//   §6.116b (9-A): extracts HH:MM from ora_ricalcolata ISO via local
//   `effHHMM` before feeding `timeToMinutes`.
// - `isCrossMidnightRecalc(entry)` – flags an entry whose ora_ricalcolata
//   ISO date is past entry.dateStr. Replaces the pre-9-A HH:MM heuristic
//   (60-min backwards delta) with a precise ISO date comparison. The Card
//   surfaces the "⚠ orario: domani" badge when this returns true.
//   §6.116/§6.118 (9-A): see DoseCard header for the full design path.
// - `formatDelta/formatDuration/formatGapLabel/formatDateLabel` – ports 1:1
//   from v5 mockup lines 34-68.
// - `groupEntriesByDayAndMomento(entries)` – hybrid grouping helper for
//   Spec §5.4 and mockup gap layout (Sessione 7b-1, AMB-7b.G / §6.29).
//   §6.116b (9-A): time-sort and `primaOra` use `effHHMM` for ISO normalisation.
//
// AMB-7a.E: getCardState never calls `new Date()`; `now` is supplied by the
// caller, whose shape matches `resolveNow` in utils/now.js ({dateStr, minutes}).
// AMB-7a.F: format helpers must not change behaviour — only the file moves.
//
// 9-A note (§6.18 closure, ISO domain layer): `ora_ricalcolata` is now an
// ISO datetime 'YYYY-MM-DDTHH:MM' (stored by recalc.js post-CP3, propagated
// opaque by planBuilder per §6.23 esteso). Local helper `effHHMM` extracts
// the HH:MM portion for any consumer that needs minutes-of-day arithmetic.
// ============================================================

import { timeToMinutes, parseIsoDateTime } from './time.js';
import { TOLLERANZA_MIN } from '../domain/constants.js';

/**
 * Return the entry's effective time as 'HH:MM'. Reads ora_ricalcolata when
 * set (ISO 'YYYY-MM-DDTHH:MM' post-9-A) and falls back to ora_prevista
 * (always 'HH:MM'). Internal helper — not exported. (§6.116b)
 *
 * @param {import('../domain/types.js').PlanEntry} entry
 * @returns {string}  'HH:MM'
 */
function effHHMM(entry) {
  if (entry.ora_ricalcolata) {
    return parseIsoDateTime(entry.ora_ricalcolata).hhmm;
  }
  return entry.ora_prevista;
}

/**
 * Resolve the visual card state for an entry given the current "now".
 *
 * Rules (applied top-down, first match wins):
 *   1. entry.stato === 'presa'    → 'presa'
 *   2. entry.stato === 'saltata'  → 'saltata'
 *   3. entry.stato === 'sospesa'  → 'sospesa'
 *   4. entry.dateStr !== now.dateStr → 'in_attesa'
 *      (other-day entries never become 'in_ritardo'; reviewing history ≠ acting)
 *   5. Otherwise compute diff = doseMin - now.minutes where
 *      doseMin = timeToMinutes(effHHMM(entry)):
 *        diff < -TOLLERANZA_MIN       → 'in_ritardo'
 *        diff >  30                   → 'in_attesa'
 *        otherwise (within tolerance or ≤30 min ahead) → 'prossima'
 *
 * @param {import('../domain/types.js').PlanEntry} entry
 * @param {{dateStr: string, minutes: number}} now
 * @returns {'presa'|'prossima'|'in_attesa'|'in_ritardo'|'saltata'|'sospesa'}
 */
export function getCardState(entry, now) {
  if (entry.stato === 'presa') return 'presa';
  if (entry.stato === 'saltata') return 'saltata';
  if (entry.stato === 'sospesa') return 'sospesa';
  if (entry.dateStr !== now.dateStr) return 'in_attesa';

  const doseMin = timeToMinutes(effHHMM(entry));
  const diff = doseMin - now.minutes;
  if (diff < -TOLLERANZA_MIN) return 'in_ritardo';
  if (diff > 30) return 'in_attesa';
  return 'prossima';
}

/**
 * Detect whether an entry has a recalculation that crosses midnight: i.e.
 * `ora_ricalcolata` (ISO 'YYYY-MM-DDTHH:MM') has a date portion strictly
 * greater than `entry.dateStr`. Lex compare on 'YYYY-MM-DD' is chronological.
 *
 * 9-A history (§6.116 + §6.118):
 *   - Pre-9-A: HH:MM heuristic detector (`< ora_prevista − 60min` wraparound).
 *   - CP4 §6.116 first iteration: replaced by `isEntryFutureDate(entry,
 *     todayDateStr)` — wrong semantics, missed the §6.18 case where
 *     entry.dateStr stays "today" but ora_ricalcolata points to tomorrow.
 *     Discovered in CP browser punto 2.
 *   - CP4 §6.118 fix: ISO-aware compare on the recalc's own date prefix vs
 *     the entry's planning date. Catches §6.18 exactly; no external
 *     "today" arg needed.
 *
 * Defensive: returns false when entry is missing or has no ora_ricalcolata.
 *
 * @param {import('../domain/types.js').PlanEntry} entry
 * @returns {boolean}
 */
export function isCrossMidnightRecalc(entry) {
  if (!entry?.ora_ricalcolata) return false;
  return parseIsoDateTime(entry.ora_ricalcolata).dateStr > entry.dateStr;
}

// ============================================================
// Format helpers (ports from v5 mockup lines 34-68)
// ============================================================

/**
 * Formatted delta for display: "in orario" when 0, otherwise "+Xh YYmin" /
 * "-X min" etc. Rule: abs < 60 → minutes only; otherwise hours + optional minutes.
 * @param {number} min
 * @returns {string}
 */
export function formatDelta(min) {
  if (min === 0) return 'in orario';
  const sign = min > 0 ? '+' : '-';
  const abs = Math.abs(min);
  if (abs < 60) return `${sign}${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Unsigned duration for display. Same rules as formatDelta without the sign.
 * @param {number} min
 * @returns {string}
 */
export function formatDuration(min) {
  const abs = Math.abs(min);
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Human-readable gap label: null when 0, otherwise "ritardo X" or "anticipo X".
 * @param {number} min
 * @returns {string|null}
 */
export function formatGapLabel(min) {
  if (min === 0) return null;
  if (min > 0) return `ritardo ${formatDuration(min)}`;
  return `anticipo ${formatDuration(min)}`;
}

/**
 * Localised date label relative to a reference date.
 *   same day → "Oggi · <weekday> <day month>"
 *   next day → "Domani · <weekday> <day month>"
 *   other    → "<weekday> <day month>"
 *
 * Uses toLocaleDateString('it-IT') so weekday/month are Italian; the weekday
 * is NOT capitalised (matches the v5 mockup output).
 *
 * @param {string} dateStr     'YYYY-MM-DD'
 * @param {string} refDateStr  'YYYY-MM-DD'
 * @returns {string}
 */
export function formatDateLabel(dateStr, refDateStr) {
  // Noon avoids TZ-driven day shifts on toISOString/locale parsing.
  const d = new Date(dateStr + 'T12:00:00');
  const r = new Date(refDateStr + 'T12:00:00');
  const diff = Math.round((d - r) / 86400000);
  const wk = d.toLocaleDateString('it-IT', { weekday: 'long' });
  const dm = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  if (diff === 0) return `Oggi · ${wk} ${dm}`;
  if (diff === 1) return `Domani · ${wk} ${dm}`;
  return `${wk} ${dm}`;
}

// ============================================================
// Hybrid grouping for vista Oggi (Sessione 7b-1, AMB-7b.G / §6.29)
// ============================================================

/**
 * Partition plan entries into a per-day layout suited for the Oggi view.
 *
 * Shape:
 *   [{dateStr, groups: [{descrizioneMomento, primaOra, entries: PlanEntry[]}]}]
 *
 * Ordering:
 *   - Days are sorted by dateStr ASC.
 *   - Within a day, entries are sorted by effective time ASC, where effective
 *     time = `effHHMM(entry)` (= ora_ricalcolata HH:MM portion when set,
 *     ora_prevista otherwise). This matches the sort used by Card rendering
 *     and by `selectCountersForDay` for prossimoIn.
 *
 * Grouping rule (§6.29):
 *   A new group opens whenever `orario.descrizione_momento` differs from the
 *   previous entry in the day. This yields one group per momento per day even
 *   when multiple distinct times share the same momento (e.g. 08:00 and 08:30
 *   both "colazione" belong together). Within a group, individual time gaps
 *   drive the visual spacing decision in the UI layer, not the grouping.
 *
 * `descrizioneMomento` is read from `entry.orario?.descrizione_momento` and
 * normalised to `null` when absent. Consecutive nulls collapse into a single
 * group, mirroring any other shared value.
 *
 * `primaOra` is the effective time of the group's first entry as 'HH:MM'
 * (extracted from ora_ricalcolata ISO when set — §6.116b). Consumers use it
 * directly in the "ORE HH:MM — DESCRIZIONE_MOMENTO" header.
 *
 * The helper is pure: it returns a fresh structure and never mutates `entries`.
 *
 * @param {import('../domain/types.js').PlanEntry[]} entries
 * @returns {Array<{
 *   dateStr: string,
 *   groups: Array<{
 *     descrizioneMomento: string | null,
 *     primaOra: string,
 *     entries: import('../domain/types.js').PlanEntry[]
 *   }>
 * }>}
 */
export function groupEntriesByDayAndMomento(entries) {
  if (!entries || entries.length === 0) return [];

  // 1. Partition by dateStr. Preserve insertion order inside each bucket;
  //    the subsequent sort reorders by effective time anyway.
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.dateStr)) byDate.set(e.dateStr, []);
    byDate.get(e.dateStr).push(e);
  }

  // 2. Build the day-level output: sort the day's entries, then split on
  //    descrizione_momento transitions.
  const days = [];
  const sortedDateKeys = [...byDate.keys()].sort();
  // Sentinel distinct from any possible momento value (string | null).
  const NO_PREV = Symbol('no-prev');

  for (const dateStr of sortedDateKeys) {
    const sorted = byDate.get(dateStr).slice().sort((a, b) => {
      const am = timeToMinutes(effHHMM(a));
      const bm = timeToMinutes(effHHMM(b));
      return am - bm;
    });

    const groups = [];
    let current = null;
    let lastMomento = NO_PREV;

    for (const e of sorted) {
      const momento = e.orario?.descrizione_momento ?? null;
      if (momento !== lastMomento) {
        current = {
          descrizioneMomento: momento,
          primaOra: effHHMM(e),
          entries: [e],
        };
        groups.push(current);
        lastMomento = momento;
      } else {
        current.entries.push(e);
      }
    }

    days.push({ dateStr, groups });
  }

  return days;
}
