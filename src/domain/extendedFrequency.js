/**
 * @fileoverview Helper for "extended" frequency drugs (intervallo_ore > 24h),
 * e.g., weekly methotrexate. These do not fit the per-day day-loop iteration
 * model used in planBuilder for standard drugs (intervallo_ore <= 24h).
 *
 * Branch isolato per evitare regressioni sul path standard. Vedi Changelog
 * Fase 2 §22.42 (opt B' modulare ratificata) e §22.43 (lista impl 18 punti,
 * voce 14: extendedFrequency.js helper + branch planBuilder).
 *
 * Anchor convention (EXT.1, §22.42): occurrences are computed as
 *
 *   anchor = (data_inizio at computeOraPrevista(orario, profilo))
 *   t_k    = anchor + k * intervallo_ore   (k = 0, 1, 2, ...)
 *
 * for all t_k inside the window [windowStart, windowEnd) and not past
 * data_fine (if present). dosi_giornaliere = 1 is enforced upstream by
 * FarmaciTab UI (EXT.2, §22.42); the helper defensively uses the first
 * orario row only.
 *
 * Pure function: no Date.now(), no DB, no globals.
 *
 * Known limitation: ms-arithmetic stride does not compensate for DST
 * transitions. For weekly intervals (168h), occurrences may shift by ±1h
 * across DST boundaries. Accepted by-design for v3.0.0; covered by §22.42
 * audit verdict "addMinutesToIso aritmeticamente corretto".
 */

import { timeToMinutes } from '../utils/time.js';
import { computeOraPrevista } from './orarioResolver.js';

const MS_PER_HOUR = 3600 * 1000;

/**
 * Add n days to 'YYYY-MM-DD'. Local duplicate of planBuilder's addDaysLocal
 * to avoid cross-domain coupling (§6.181 pattern: scope creep avoidance).
 */
function addDaysLocal(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Format a Date object back to 'YYYY-MM-DD' using its local components.
 */
function isoDateLocal(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Whether a farmaco follows the extended-frequency branch.
 * Threshold strict: intervallo_ore > 24 (EXT.3' Q2=a, §22.42).
 *
 * @param {import('./types.js').Farmaco} farmaco
 * @returns {boolean}
 */
export function isExtendedInterval(farmaco) {
  return (
    farmaco.tipo_frequenza === 'intervallo' &&
    typeof farmaco.intervallo_ore === 'number' &&
    farmaco.intervallo_ore > 24
  );
}

/**
 * Compute occurrences of an extended-frequency farmaco within the window
 * [windowStart, windowEnd) where windowStart=startDate (00:00 local) and
 * windowEnd=startDate+numDays (00:00 local).
 *
 * Returns partial rows that the caller (planBuilder) wraps into PlanEntry.
 * Caller is responsible for log merge, sort, and PlanEntry shape.
 *
 * @param {import('./types.js').Farmaco} farmaco — must satisfy isExtendedInterval()
 * @param {import('./types.js').OrarioBase[]} orariFarmaco — orari for THIS farmaco only
 * @param {import('./types.js').Profilo} profilo
 * @param {string} startDate 'YYYY-MM-DD' inclusive window start
 * @param {number} numDays — window length in days, exclusive end
 * @returns {Array<{dateStr: string, orario: import('./types.js').OrarioBase, oraPrevista: string}>}
 */
export function computeExtendedOccurrencesInWindow(
  farmaco,
  orariFarmaco,
  profilo,
  startDate,
  numDays,
) {
  // Defensive: extended branch requires data_inizio anchor + at least one orario row.
  if (!farmaco.data_inizio) return [];
  if (!orariFarmaco || orariFarmaco.length === 0) return [];

  // Convention §22.42 EXT.2: dosi_giornaliere = 1 enforced upstream.
  // Defensively use the first orario row as the anchor template.
  const orario = orariFarmaco[0];

  const oraPrevista = computeOraPrevista(orario, profilo);
  const oraPrevistaMin = timeToMinutes(oraPrevista);

  // Anchor: data_inizio at oraPrevista (local time).
  const anchorBase = new Date(farmaco.data_inizio + 'T00:00:00');
  anchorBase.setMinutes(anchorBase.getMinutes() + oraPrevistaMin);
  const anchorMs = anchorBase.getTime();

  // Window bounds: [startDate 00:00, startDate+numDays 00:00).
  const windowStartMs = new Date(startDate + 'T00:00:00').getTime();
  const windowEndMs = new Date(addDaysLocal(startDate, numDays) + 'T00:00:00').getTime();

  // data_fine cutoff: inclusive of the day, so end-of-day = next day 00:00.
  let dataFineMs = Infinity;
  if (farmaco.data_fine) {
    dataFineMs = new Date(addDaysLocal(farmaco.data_fine, 1) + 'T00:00:00').getTime();
  }

  const intervalMs = farmaco.intervallo_ore * MS_PER_HOUR;

  // Compute starting k: smallest non-negative integer such that
  // anchorMs + k * intervalMs >= windowStartMs.
  // If anchor is in or after the window, k=0 is the first candidate.
  const kStart =
    anchorMs >= windowStartMs
      ? 0
      : Math.ceil((windowStartMs - anchorMs) / intervalMs);

  const out = [];
  for (let k = Math.max(0, kStart); ; k++) {
    const tMs = anchorMs + k * intervalMs;
    if (tMs >= windowEndMs) break;
    if (tMs >= dataFineMs) break;
    const occDate = new Date(tMs);
    out.push({
      dateStr: isoDateLocal(occDate),
      orario,
      oraPrevista,
    });
  }

  return out;
}
