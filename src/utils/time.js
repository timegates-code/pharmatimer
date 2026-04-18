/**
 * Time utilities — pure, no Date.now(), no globals.
 * Input contract: callers pass well-formed strings ('HH:MM', 'YYYY-MM-DD').
 * Malformed input is a bug upstream; no defensive validation here (Step 4a rule).
 */

/**
 * Convert 'HH:MM' to total minutes from 00:00.
 * @param {string} t 'HH:MM'
 * @returns {number}
 */
export function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes to 'HH:MM'. Wraps around 1440 (minutes % 1440).
 * Handles negative values.
 * @param {number} total
 * @returns {string}
 */
export function minutesToTime(total) {
  const m = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Add n days to 'YYYY-MM-DD'. Uses noon to avoid UTC shift across timezones.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {number} n integer, may be negative
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Compute delta in minutes between planned and actual DATETIME.
 * Positive = late, negative = early.
 * DATETIME-based: no ±720 wraparound (fixes v5 bug where 13h delay was read as 11h anticipation).
 *
 * @param {object} p
 * @param {string} p.dataPrevista  'YYYY-MM-DD'
 * @param {string} p.oraPrevista   'HH:MM'
 * @param {string} p.dataEffettiva 'YYYY-MM-DD'
 * @param {string} p.oraEffettiva  'HH:MM'
 * @returns {number} minutes (integer)
 */
export function calcolaDelta({ dataPrevista, oraPrevista, dataEffettiva, oraEffettiva }) {
  const planned = new Date(`${dataPrevista}T${oraPrevista}:00`);
  const actual = new Date(`${dataEffettiva}T${oraEffettiva}:00`);
  return Math.round((actual.getTime() - planned.getTime()) / 60000);
}

/**
 * Format a signed minute delta for display.
 * 0 → "in orario"; else sign + abs value with min/h/h min formatting.
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
 * Format an unsigned duration for display.
 * @param {number} min non-negative minutes
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
 * Format a gap value as 'ritardo ...' / 'anticipo ...' / null.
 * @param {number} min
 * @returns {string|null}
 */
export function formatGapLabel(min) {
  if (min === 0) return null;
  if (min > 0) return `ritardo ${formatDuration(min)}`;
  return `anticipo ${formatDuration(min)}`;
}

/**
 * Human-readable date label relative to reference date.
 * 'Oggi · lunedì 16 aprile' / 'Domani · martedì 17 aprile' / 'mercoledì 18 aprile'.
 *
 * Not covered by T01 (UI helper); kept here because it's a time utility.
 *
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} refDate 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatDateLabel(dateStr, refDate) {
  const d = new Date(dateStr + 'T12:00:00');
  const r = new Date(refDate + 'T12:00:00');
  const diff = Math.round((d.getTime() - r.getTime()) / 86400000);
  const wk = d.toLocaleDateString('it-IT', { weekday: 'long' });
  const dm = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  if (diff === 0) return `Oggi · ${wk} ${dm}`;
  if (diff === 1) return `Domani · ${wk} ${dm}`;
  return `${wk} ${dm}`;
}
