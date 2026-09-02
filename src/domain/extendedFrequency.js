/**
 * @fileoverview Helper for "extended" frequency drugs (intervallo_ore > 24h),
 * e.g., weekly methotrexate. These do not fit the per-day day-loop iteration
 * model used in planBuilder for standard drugs (intervallo_ore <= 24h).
 *
 * Branch isolato per evitare regressioni sul path standard. Vedi Changelog
 * Fase 2 §22.42 (opt B' modulare ratificata) e §22.43 (lista impl 18 punti,
 * voce 14: extendedFrequency.js helper + branch planBuilder).
 *
 * Anchor convention (EXT.1, §22.42 -- EMENDATA da P15-A,
 * par.22.198-quindecies-bis): occurrences are computed as
 *
 *   anchor = (data_inizio at computeOraPrevista(orario, profilo))
 *   t_k    = k-esima occorrenza dell ancora SECONDO IL CANONE
 *
 * for all t_k inside the window [windowStart, windowEnd) and not past
 * data_fine (if present). dosi_giornaliere = 1 is enforced upstream by
 * FarmaciTab UI (EXT.2, §22.42); the helper defensively uses the first
 * orario row only.
 *
 * LA CADENZA NON SI CALCOLA QUI: e delegata a extendedStride.js, canone
 * unico condiviso con startBoundary.js (Q-P15-7=(A)). La formula EXT.1
 * t_k = anchor + k * intervallo_ore vale ORA SOLO per il ramo ms: per
 * intervallo_ore multiplo di 24 la cadenza e a GIORNI CIVILI a orario fisso
 * (Q1=(a) / Q-P15-2=(A)).
 *
 * La vecchia "Known limitation" era FALSA IN ENTRAMBE LE DIREZIONI e va
 * letta nel canone, non qui: il difetto ms non era "+/-1h estetico" ma
 * +/-1 GIORNO sulla data della dose (M2-M5, par.22.198-quindecies), e il
 * verdetto §22.42 "addMinutesToIso aritmeticamente corretto" che la
 * giustificava riguarda una funzione a semantica CIVILE (misattribuzione
 * misurata M1). Vedi extendedStride.js.
 *
 * Pure function: no Date.now(), no DB, no globals.
 */

import { addDays, normalizeWallTime } from '../utils/time.js';
import { computeOraPrevista, isOrarioNonRisolvibile } from './orarioResolver.js';
import { computeTInizio } from './startBoundary.js';
import { firstKOnOrAfterIso, occurrenceDateAt } from './extendedStride.js';

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
 * @returns {Array<{dateStr: string, orario: import('./types.js').OrarioBase, oraPrevista: string|null, nonRisolvibile?: true}>}
 *   oraPrevista is the label ON THAT DAY (DST slide applied); null with
 *   nonRisolvibile=true when the orario cannot be resolved (P3 containment).
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

  // Recurring label, CONSTANT across k: the canon needs it only for the
  // millisecond branch and for the boundary compare. P3 containment: an
  // unresolvable orario keeps the farmaco visible -- the civil cadence does
  // not depend on the time, midnight stands in for the search, and every
  // occurrence is materialised with no time and the flag set.
  let oraPrevista;
  let nonRisolvibile = false;
  try {
    oraPrevista = computeOraPrevista(orario, profilo);
  } catch (err) {
    if (!isOrarioNonRisolvibile(err)) throw err;
    nonRisolvibile = true;
    oraPrevista = '00:00';
  }

  // P20 par.4.8 (s.6.254): therapy-start boundary -- filtered HERE, at
  // the single generation point (Q3-P20=G): covers planBuilder AND the
  // selectors' 365-day window (selectProssimaDoseFuoriPlan) alike.
  // Fallback (A) sub-Q-P20: rows without created_at degrade to
  // data_inizio 00:00 = the anchor itself is never excluded (pre-P20).
  // SENTINEL_P20_EXT_TINIZIO
  const tInizio = computeTInizio(farmaco.data_inizio, farmaco.created_at);

  // Cadenza: CANONE UNICO (extendedStride.js). Qui non si calcola piu ne
  // ancora ne stride: si iterano DATE, non istanti. SENTINEL_P15A_EXT_CANONE
  const ore = farmaco.intervallo_ore;
  const windowEndDate = addDays(startDate, numDays); // esclusiva

  // I due cutoff passano da istanti a stringa-data. EQUIVALENZA MISURATA
  // (par.22.198-quindecies-bis, 34.680 casi, 0 mismatch): gli estremi sono
  // sempre MEZZANOTTI, quindi
  //   tMs >= windowEndMs        <=>  dateStr >= windowEndDate
  //   tMs >= (data_fine+1)T00:00 <=>  dateStr >  data_fine
  const out = [];
  let k = firstKOnOrAfterIso(
    farmaco.data_inizio,
    oraPrevista,
    ore,
    `${startDate}T00:00`,
  );
  for (; ; k += 1) {
    const dateStr = occurrenceDateAt(farmaco.data_inizio, oraPrevista, ore, k);
    if (dateStr >= windowEndDate) break;
    if (farmaco.data_fine && dateStr > farmaco.data_fine) break;
    if (nonRisolvibile) {
      // No time: the visibility rule cannot hide what it cannot place.
      out.push({ dateStr, orario, oraPrevista: null, nonRisolvibile: true });
      continue;
    }
    // Decisione 1 (DST): the label ON THIS DAY, slid out of a skipped hour.
    const label = normalizeWallTime(dateStr, oraPrevista);
    // SENTINEL_P20_EXT_SKIP -- visibility rule: T_dose >= T_inizio.
    if (tInizio != null && `${dateStr}T${label}` < tInizio) continue;
    out.push({
      dateStr,
      orario,
      oraPrevista: label,
    });
  }

  return out;
}
