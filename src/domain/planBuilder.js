import { timeToMinutes } from '../utils/time.js';
import { computeOraPrevista } from './orarioResolver.js';

// Re-export for backward compatibility with existing consumers and tests
// that import { computeOraPrevista } from './planBuilder.js'.
// Canonical location is ./orarioResolver.js — see Changelog Fase 2 §6.16.
export { computeOraPrevista };

/**
 * Pure plan builder. Computes a derived view of (date, farmaco, dose) rows
 * from profilo + farmaci + orari_base + log_assunzioni.
 *
 * Purity rule: no Date.now(), no DB, no globals. Everything comes from ctx.
 * Input contract: data is well-formed (Step 4a — no defensive validation).
 */

/**
 * Add n days to 'YYYY-MM-DD'. Local duplicate of utils/time addDays to avoid
 * exposing that internal here; kept private.
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
 * Check whether a farmaco is active on a given date.
 * Inactive farmaci (attivo=0) are always filtered out.
 * data_inizio and data_fine (if present) bound the range inclusively.
 *
 * @param {import('./types.js').Farmaco} farmaco
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {boolean}
 */
function isFarmacoActiveOn(farmaco, dateStr) {
  if (!farmaco.attivo) return false;
  if (farmaco.data_inizio && farmaco.data_inizio > dateStr) return false;
  if (farmaco.data_fine && farmaco.data_fine < dateStr) return false;
  return true;
}

/**
 * Build the plan entry key. Stable across sessions.
 * @param {string} dateStr
 * @param {number} farmacoId
 * @param {number} doseNumero
 * @returns {string}
 */
function entryKey(dateStr, farmacoId, doseNumero) {
  return `${dateStr}-${farmacoId}-${doseNumero}`;
}

/**
 * Merge a log row into a plan entry. Mutates the entry in place.
 * The log is the source of truth: fields present on the log override defaults.
 *
 * @param {import('./types.js').PlanEntry} entry
 * @param {import('./types.js').LogAssunzione} log
 */
function mergeLogIntoEntry(entry, log) {
  entry.stato = log.stato;
  entry.ora_effettiva = log.ora_effettiva ?? null;
  entry.delta_minuti = log.delta_minuti ?? null;
  entry.ora_ricalcolata = log.ora_ricalcolata ?? null;
  entry.gap_minuti = log.gap_minuti ?? 0;
  entry.recupero_minuti = log.recupero_minuti ?? 0;
}

/**
 * Build a multi-day plan from the given context.
 * Entries are sorted by (dateStr ASC, ora_prevista ASC).
 * Log rows that don't match any planned entry are silently ignored.
 *
 * @param {import('./types.js').PlanContext} ctx
 * @returns {import('./types.js').Plan}
 */
export function buildMultiDayPlan(ctx) {
  const { profilo, farmaci, orari, logAssunzioni, startDate, numDays } = ctx;

  // Index orari by farmaco_id for fast lookup.
  const orariByFarmaco = new Map();
  for (const o of orari) {
    if (!orariByFarmaco.has(o.farmaco_id)) orariByFarmaco.set(o.farmaco_id, []);
    orariByFarmaco.get(o.farmaco_id).push(o);
  }

  // Index log by composite key for O(1) merge.
  const logByKey = new Map();
  for (const log of logAssunzioni) {
    logByKey.set(entryKey(log.data, log.farmaco_id, log.dose_numero), log);
  }

  /** @type {import('./types.js').Plan} */
  const plan = [];

  for (let d = 0; d < numDays; d++) {
    const dateStr = addDaysLocal(startDate, d);
    for (const farmaco of farmaci) {
      if (!isFarmacoActiveOn(farmaco, dateStr)) continue;
      const orariF = orariByFarmaco.get(farmaco.id) || [];
      for (const orario of orariF) {
        /** @type {import('./types.js').PlanEntry} */
        const entry = {
          key: entryKey(dateStr, farmaco.id, orario.dose_numero),
          dateStr,
          farmaco,
          orario,
          ora_prevista: computeOraPrevista(orario, profilo),
          ora_ricalcolata: null,
          ora_ricalcolata_originale: null,
          ora_effettiva: null,
          delta_minuti: null,
          gap_minuti: 0,
          gap_originale: 0,
          recupero_minuti: 0,
          stato: 'prevista',
          dose_prec_saltata: false,
        };
        const log = logByKey.get(entry.key);
        if (log) mergeLogIntoEntry(entry, log);
        plan.push(entry);
      }
    }
  }

  // Sort: dateStr ASC, then ora_prevista ASC.
  plan.sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr < b.dateStr ? -1 : 1;
    return timeToMinutes(a.ora_prevista) - timeToMinutes(b.ora_prevista);
  });

  return plan;
}
