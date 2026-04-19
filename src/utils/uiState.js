// ============================================================
// Pure UI-state helpers for vista Oggi.
//
// - `getCardState(entry, now)` – one of 6 visual states, derived from entry.stato
//   and the diff between `now` and the effective scheduled time
//   (ora_ricalcolata fallback ora_prevista). See Changelog §5.3 + §6.9.
// - `isCrossMidnightRecalc(entry)` – workaround detector for §6.18 / §6.26:
//   flags an entry whose ora_ricalcolata wrapped past midnight without a
//   dateStr bump (Card will show a "⚠ orario: domani" badge in 7b).
// - `formatDelta/formatDuration/formatGapLabel/formatDateLabel` – ports 1:1
//   from v5 mockup lines 34-68.
//
// AMB-7a.E: getCardState never calls `new Date()`; `now` is supplied by the
// caller, whose shape matches `resolveNow` in utils/now.js ({dateStr, minutes}).
// AMB-7a.F: format helpers must not change behaviour — only the file moves.
// ============================================================

import { timeToMinutes } from './time.js';
import { TOLLERANZA_MIN } from '../domain/constants.js';

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
 *      doseMin = timeToMinutes(entry.ora_ricalcolata ?? entry.ora_prevista):
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

  const effTime = entry.ora_ricalcolata ?? entry.ora_prevista;
  const doseMin = timeToMinutes(effTime);
  const diff = doseMin - now.minutes;
  if (diff < -TOLLERANZA_MIN) return 'in_ritardo';
  if (diff > 30) return 'in_attesa';
  return 'prossima';
}

/**
 * Detect the cross-midnight recalc bug (§6.18). Returns true when the
 * recalculated time appears more than 60 minutes BEFORE the planned one:
 * this indicates a wraparound (e.g. 23:00 recalculated to 07:00 next day,
 * stored as "07:00" on the original dateStr).
 *
 * 60 minutes is the empirical tolerance: no legitimate recovery should
 * shift the scheduled time by more than an hour backwards.
 *
 * @param {import('../domain/types.js').PlanEntry} entry
 * @returns {boolean}
 */
export function isCrossMidnightRecalc(entry) {
  if (entry.ora_ricalcolata == null) return false;
  return timeToMinutes(entry.ora_ricalcolata) < timeToMinutes(entry.ora_prevista) - 60;
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
